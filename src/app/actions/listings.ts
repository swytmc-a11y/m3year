"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireAdmin } from "@/lib/auth";
import { listingFormSchema, rejectionSchema } from "@/lib/validations/listing";
import type { ActionState } from "@/lib/action-state";

function parseListingForm(formData: FormData) {
  return listingFormSchema.safeParse({
    title: formData.get("title"),
    sector: formData.get("sector"),
    city: formData.get("city"),
    monthly_revenue: formData.get("monthly_revenue"),
    offered_percentage: formData.get("offered_percentage"),
    description: formData.get("description"),
  });
}

function revalidateListingSurfaces() {
  revalidatePath("/dashboard/listings");
  revalidatePath("/listings");
  revalidatePath("/admin/listings");
}

// --- Create -----------------------------------------------------------------
export async function createListing(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // "submit" sends it straight to the moderation queue; otherwise save a draft.
  const submit = formData.get("intent") === "submit";
  const status = submit ? "pending_review" : "draft";

  const supabase = await createClient();
  const { error } = await supabase.from("listings").insert({
    owner_id: user.id,
    title: parsed.data.title,
    sector: parsed.data.sector,
    city: parsed.data.city,
    monthly_revenue: parsed.data.monthly_revenue,
    offered_percentage: parsed.data.offered_percentage,
    description: parsed.data.description,
    status,
  });

  if (error) {
    console.error("[listings] create failed", error);
    return { error: "تعذّر حفظ الإعلان الآن. حاول مرة أخرى." };
  }

  revalidateListingSurfaces();
  redirect("/dashboard/listings");
}

// --- Update -----------------------------------------------------------------
export async function updateListing(
  listingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = parseListingForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const submit = formData.get("intent") === "submit";
  const supabase = await createClient();

  // RLS ensures only the owner (or an admin) can update this row.
  const { error } = await supabase
    .from("listings")
    .update({
      title: parsed.data.title,
      sector: parsed.data.sector,
      city: parsed.data.city,
      monthly_revenue: parsed.data.monthly_revenue,
      offered_percentage: parsed.data.offered_percentage,
      description: parsed.data.description,
      ...(submit ? { status: "pending_review" as const } : {}),
    })
    .eq("id", listingId);

  if (error) {
    console.error("[listings] update failed", error);
    return { error: "تعذّر تحديث الإعلان الآن. حاول مرة أخرى." };
  }

  revalidateListingSurfaces();
  redirect("/dashboard/listings");
}

// --- Owner state transitions ------------------------------------------------
export async function submitListingForReview(formData: FormData) {
  await requireUser();
  const listingId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({ status: "pending_review" })
    .eq("id", listingId);

  if (error) {
    console.error("[listings] submit-for-review failed", error);
  } else {
    await supabase.rpc("log_audit", {
      p_action: "listing.submitted",
      p_entity_type: "listing",
      p_entity_id: listingId,
    });
  }

  revalidateListingSurfaces();
  redirect("/dashboard/listings");
}

export async function archiveListing(formData: FormData) {
  await requireUser();
  const listingId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({ status: "archived" })
    .eq("id", listingId);

  if (error) console.error("[listings] archive failed", error);

  revalidateListingSurfaces();
  redirect("/dashboard/listings");
}

// --- Admin moderation -------------------------------------------------------
export async function approveListing(formData: FormData) {
  await requireAdmin();
  const listingId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({
      status: "published",
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", listingId);

  if (error) {
    console.error("[listings] approve failed", error);
  } else {
    await supabase.rpc("log_audit", {
      p_action: "listing.approved",
      p_entity_type: "listing",
      p_entity_id: listingId,
    });
  }

  revalidateListingSurfaces();
  redirect("/admin/listings");
}

export async function rejectListing(
  listingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = rejectionSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("listings")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      rejection_reason: parsed.data.reason,
    })
    .eq("id", listingId);

  if (error) {
    console.error("[listings] reject failed", error);
    return { error: "تعذّر رفض الإعلان الآن. حاول مرة أخرى." };
  }

  await supabase.rpc("log_audit", {
    p_action: "listing.rejected",
    p_entity_type: "listing",
    p_entity_id: listingId,
    p_metadata: { reason: parsed.data.reason },
  });

  revalidateListingSurfaces();
  redirect("/admin/listings");
}
