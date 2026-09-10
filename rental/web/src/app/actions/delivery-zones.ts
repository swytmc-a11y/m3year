"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

/**
 * Delivery zones and their fee.
 *
 * A zone tied to a branch is only offered for that branch's cars; leaving the
 * branch empty offers it everywhere. The database enforces the same rule at
 * booking time, so a zone cannot commit a branch to a drive it never agreed
 * to even if this form is bypassed.
 */
export async function createDeliveryZone(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const branchId = String(formData.get("branch_id") ?? "").trim();
  const feeRaw = String(formData.get("fee") ?? "").trim();
  const fee = Number(feeRaw);

  if (name.length < 2) return { error: "أدخل اسم المنطقة." };
  if (city.length < 2) return { error: "أدخل المدينة." };
  if (feeRaw === "" || Number.isNaN(fee) || fee < 0) return { error: "أدخل رسومًا صحيحة." };

  const { error } = await supabase.from("delivery_zones").insert({
    name,
    city,
    fee,
    branch_id: branchId || null,
    note: String(formData.get("note") ?? "").trim() || null,
  });

  if (error) {
    console.error("[delivery-zones] create failed", error);
    return { error: "تعذّر إضافة المنطقة." };
  }

  revalidatePath("/admin/delivery-zones");
  return { success: true };
}

export async function setDeliveryZoneActive(id: string, isActive: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("delivery_zones").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/delivery-zones");
}

/**
 * Deactivating is the normal way to retire a zone. Deleting is refused by the
 * database once a booking references it — that booking's fee has to keep
 * pointing at the zone it was charged for.
 */
export async function deleteDeliveryZone(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
  if (error) {
    return { error: "لا يمكن حذف منطقة مرتبطة بحجوزات. عطّلها بدل حذفها." };
  }
  revalidatePath("/admin/delivery-zones");
  return {};
}
