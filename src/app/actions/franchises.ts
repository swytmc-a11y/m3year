"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { franchiseFormSchema, franchiseRejectionSchema } from "@/lib/validations/franchise";
import type { ActionState } from "@/lib/action-state";

function parseFranchiseForm(formData: FormData) {
  return franchiseFormSchema.safeParse({
    brand_name: formData.get("brand_name"),
    sector: formData.get("sector"),
    franchise_type: formData.get("franchise_type"),
    contract_duration_years: formData.get("contract_duration_years"),
    city: formData.get("city"),
    description: formData.get("description"),
    franchise_fee: formData.get("franchise_fee"),
    initial_investment_min: formData.get("initial_investment_min"),
    initial_investment_max: formData.get("initial_investment_max"),
    royalty_percentage: formData.get("royalty_percentage"),
    founding_year: formData.get("founding_year"),
    current_branches_count: formData.get("current_branches_count"),
    required_space_sqm: formData.get("required_space_sqm"),
    required_employees_count: formData.get("required_employees_count"),
    expected_payback_months: formData.get("expected_payback_months"),
    training_provided: formData.get("training_provided"),
    operational_support: formData.get("operational_support"),
    marketing_support: formData.get("marketing_support"),
  });
}

function revalidateFranchiseSurfaces() {
  revalidatePath("/franchises");
  revalidatePath("/admin/franchises");
  revalidatePath("/admin/all-franchises");
}

// --- Admin: update (content only, does not change status) -------------------
export async function adminUpdateFranchise(
  franchiseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseFranchiseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("franchises")
    .update({
      brand_name: parsed.data.brand_name,
      sector: parsed.data.sector,
      franchise_type: parsed.data.franchise_type,
      contract_duration_years: parsed.data.contract_duration_years ?? null,
      city: parsed.data.city,
      description: parsed.data.description,
      franchise_fee: parsed.data.franchise_fee,
      initial_investment_min: parsed.data.initial_investment_min ?? null,
      initial_investment_max: parsed.data.initial_investment_max ?? null,
      royalty_percentage: parsed.data.royalty_percentage ?? null,
      founding_year: parsed.data.founding_year ?? null,
      current_branches_count: parsed.data.current_branches_count ?? null,
      required_space_sqm: parsed.data.required_space_sqm ?? null,
      required_employees_count: parsed.data.required_employees_count ?? null,
      expected_payback_months: parsed.data.expected_payback_months ?? null,
      training_provided: parsed.data.training_provided,
      operational_support: parsed.data.operational_support,
      marketing_support: parsed.data.marketing_support,
    })
    .eq("id", franchiseId);

  if (error) {
    console.error("[franchises] admin update failed", error);
    return { error: "تعذّر تحديث الامتياز الآن. حاول مرة أخرى." };
  }

  revalidateFranchiseSurfaces();
  redirect("/admin/all-franchises");
}

// --- Admin moderation ---------------------------------------------------------
export async function approveFranchise(formData: FormData) {
  await requireAdmin();
  const franchiseId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("franchises")
    .update({
      status: "published",
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", franchiseId);

  if (error) {
    console.error("[franchises] approve failed", error);
  } else {
    await supabase.rpc("log_audit", {
      p_action: "franchise.approved",
      p_entity_type: "franchise",
      p_entity_id: franchiseId,
    });
  }

  revalidateFranchiseSurfaces();
  redirect("/admin/franchises");
}

export async function rejectFranchise(
  franchiseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = franchiseRejectionSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("franchises")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      rejection_reason: parsed.data.reason,
    })
    .eq("id", franchiseId);

  if (error) {
    console.error("[franchises] reject failed", error);
    return { error: "تعذّر رفض الامتياز الآن. حاول مرة أخرى." };
  }

  await supabase.rpc("log_audit", {
    p_action: "franchise.rejected",
    p_entity_type: "franchise",
    p_entity_id: franchiseId,
    p_metadata: { reason: parsed.data.reason },
  });

  revalidateFranchiseSurfaces();
  redirect("/admin/franchises");
}

export async function adminDeleteFranchise(formData: FormData) {
  await requireAdmin();
  const franchiseId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase.from("franchises").delete().eq("id", franchiseId);

  if (error) {
    console.error("[franchises] admin delete failed", error);
  } else {
    await supabase.rpc("log_audit", {
      p_action: "franchise.deleted",
      p_entity_type: "franchise",
      p_entity_id: franchiseId,
    });
  }

  revalidateFranchiseSurfaces();
  redirect("/admin/all-franchises");
}

export async function adminSetFranchiseVerification(formData: FormData) {
  await requireAdmin();
  const franchiseId = String(formData.get("id"));
  const verify = formData.get("verify") === "1";
  const supabase = await createClient();

  const { error } = await supabase
    .from("franchises")
    .update({
      verification_status: verify ? "verified" : "none",
      verified_at: verify ? new Date().toISOString() : null,
    })
    .eq("id", franchiseId);

  if (error) {
    console.error("[franchises] admin set-verification failed", error);
  } else {
    await supabase.rpc("log_audit", {
      p_action: verify ? "franchise.admin_verified" : "franchise.admin_unverified",
      p_entity_type: "franchise",
      p_entity_id: franchiseId,
    });
  }

  revalidateFranchiseSurfaces();
  redirect("/admin/all-franchises");
}
