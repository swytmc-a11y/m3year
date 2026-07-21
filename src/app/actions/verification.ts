"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireAdmin } from "@/lib/auth";
import {
  assignAccountantSchema,
  completeVerificationSchema,
  rejectVerificationSchema,
  accountantApplicationSchema,
  MAX_REPORT_SIZE,
  ALLOWED_REPORT_TYPE,
} from "@/lib/validations/verification";
import type { ActionState } from "@/lib/action-state";

function revalidateVerificationSurfaces() {
  revalidatePath("/admin/verification-requests");
  revalidatePath("/admin/accountants");
  revalidatePath("/accountant/requests");
  revalidatePath("/dashboard/listings");
  revalidatePath("/listings");
}

// --- Accountant application (any signed-in user) ----------------------------
export async function applyAsAccountant(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = accountantApplicationSchema.safeParse({
    fullName: formData.get("fullName"),
    socpaNumber: formData.get("socpaNumber"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("accountants").upsert({
    id: user.id,
    socpa_number: parsed.data.socpaNumber,
    bio: parsed.data.bio,
  });

  if (error) {
    console.error("[verification] accountant application failed", error);
    return { error: "تعذّر إرسال الطلب الآن. حاول مرة أخرى." };
  }

  await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);

  revalidatePath("/accountant/requests");
  redirect("/accountant/requests");
}

// --- Admin: manage accountants ----------------------------------------------
export async function activateAccountant(formData: FormData) {
  await requireAdmin();
  const accountantId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("accountants")
    .update({ is_active: true })
    .eq("id", accountantId);
  if (error) console.error("[verification] activate accountant failed", error);

  // Also mark the profile role so their identity is clear across the platform.
  await supabase
    .from("profiles")
    .update({ role: "accountant" })
    .eq("id", accountantId);

  await supabase.rpc("log_audit", {
    p_action: "accountant.activated",
    p_entity_type: "accountant",
    p_entity_id: accountantId,
  });

  revalidateVerificationSurfaces();
  redirect("/admin/accountants");
}

export async function deactivateAccountant(formData: FormData) {
  await requireAdmin();
  const accountantId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("accountants")
    .update({ is_active: false })
    .eq("id", accountantId);
  if (error) console.error("[verification] deactivate accountant failed", error);

  await supabase.rpc("log_audit", {
    p_action: "accountant.deactivated",
    p_entity_type: "accountant",
    p_entity_id: accountantId,
  });

  revalidateVerificationSurfaces();
  redirect("/admin/accountants");
}

// --- Admin: assign an accountant to a request -------------------------------
export async function assignAccountant(
  requestId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = assignAccountantSchema.safeParse({
    accountantId: formData.get("accountantId"),
    feeAmount: formData.get("feeAmount") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("verification_requests")
    .update({
      accountant_id: parsed.data.accountantId,
      status: "assigned",
      ...(parsed.data.feeAmount != null ? { fee_amount: parsed.data.feeAmount } : {}),
    })
    .eq("id", requestId);

  if (error) {
    console.error("[verification] assign failed", error);
    return { error: "تعذّر إسناد الطلب الآن. حاول مرة أخرى." };
  }

  await supabase.rpc("log_audit", {
    p_action: "verification_request.assigned",
    p_entity_type: "verification_request",
    p_entity_id: requestId,
    p_metadata: { accountant_id: parsed.data.accountantId },
  });

  revalidateVerificationSurfaces();
  redirect("/admin/verification-requests");
}

// --- Accountant: move to in_review ------------------------------------------
export async function startReview(formData: FormData) {
  await requireUser();
  const requestId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("verification_requests")
    .update({ status: "in_review" })
    .eq("id", requestId);
  if (error) console.error("[verification] start review failed", error);

  revalidateVerificationSurfaces();
  redirect("/accountant/requests");
}

// --- Accountant: complete with report upload --------------------------------
export async function completeVerification(
  requestId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = completeVerificationSchema.safeParse({
    verifiedRevenue: formData.get("verifiedRevenue"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const file = formData.get("report");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "أرفق تقرير التوثيق (PDF)." };
  }
  if (file.type !== ALLOWED_REPORT_TYPE) {
    return { error: "التقرير يجب أن يكون بصيغة PDF." };
  }
  if (file.size > MAX_REPORT_SIZE) {
    return { error: "حجم الملف يتجاوز 10 ميجابايت." };
  }

  const supabase = await createClient();
  const reportPath = `${requestId}/${Date.now()}-report.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("verification-reports")
    .upload(reportPath, file, {
      contentType: ALLOWED_REPORT_TYPE,
      upsert: false,
    });

  if (uploadError) {
    console.error("[verification] report upload failed", uploadError);
    return { error: "تعذّر رفع التقرير الآن. حاول مرة أخرى." };
  }

  const { error } = await supabase
    .from("verification_requests")
    .update({
      status: "completed",
      verified_revenue: parsed.data.verifiedRevenue,
      report_path: reportPath,
      completed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error("[verification] complete failed", error);
    return { error: "تعذّر إكمال التوثيق الآن. حاول مرة أخرى." };
  }

  revalidateVerificationSurfaces();
  redirect("/accountant/requests");
}

// --- Accountant: reject ------------------------------------------------------
export async function rejectVerification(
  requestId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = rejectVerificationSchema.safeParse({
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("verification_requests")
    .update({ status: "rejected", notes: parsed.data.notes })
    .eq("id", requestId);

  if (error) {
    console.error("[verification] reject failed", error);
    return { error: "تعذّر رفض الطلب الآن. حاول مرة أخرى." };
  }

  revalidateVerificationSurfaces();
  redirect("/accountant/requests");
}
