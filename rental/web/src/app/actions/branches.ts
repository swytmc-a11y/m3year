"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { branchFormSchema } from "@/lib/validations/branch";
import type { ActionState } from "@/lib/action-state";

function parseBranchForm(formData: FormData) {
  return branchFormSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    working_hours: formData.get("working_hours"),
    deposit_note: formData.get("deposit_note"),
    default_confirmation_mode: formData.get("default_confirmation_mode"),
    // An unchecked checkbox sends nothing at all.
    is_active: formData.get("is_active") === "on",
    sort_order: formData.get("sort_order") || 0,
  });
}

function revalidateBranchSurfaces() {
  revalidatePath("/admin/branches");
  revalidatePath("/admin");
}

export async function createBranch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseBranchForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    console.error("[branches] create failed", error);
    return { error: "تعذّر إنشاء الفرع الآن. حاول مرة أخرى." };
  }

  await supabase.rpc("log_audit", {
    p_action: "branch.created",
    p_entity_type: "branch",
    p_entity_id: data.id,
  });

  revalidateBranchSurfaces();
  redirect("/admin/branches");
}

export async function updateBranch(
  branchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseBranchForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("branches").update(parsed.data).eq("id", branchId);

  if (error) {
    console.error("[branches] update failed", error);
    return { error: "تعذّر تحديث الفرع الآن. حاول مرة أخرى." };
  }

  await supabase.rpc("log_audit", {
    p_action: "branch.updated",
    p_entity_type: "branch",
    p_entity_id: branchId,
  });

  revalidateBranchSurfaces();
  redirect("/admin/branches");
}

/**
 * Deactivates rather than deletes. Cars and bookings reference a branch
 * with ON DELETE RESTRICT on purpose — a branch that ever took a booking
 * is part of the record and must not vanish from it.
 */
export async function toggleBranchActive(formData: FormData) {
  await requireAdmin();
  const branchId = String(formData.get("id"));
  const next = formData.get("active") === "1";

  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({ is_active: next })
    .eq("id", branchId);

  if (error) {
    console.error("[branches] toggle failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: next ? "branch.activated" : "branch.deactivated",
    p_entity_type: "branch",
    p_entity_id: branchId,
  });

  revalidateBranchSurfaces();
}
