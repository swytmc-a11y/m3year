"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { couponFormSchema } from "@/lib/validations/coupon";
import type { ActionState } from "@/lib/action-state";

function parseCouponForm(formData: FormData) {
  return couponFormSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description"),
    discount_type: formData.get("discount_type"),
    discount_value: formData.get("discount_value"),
    max_discount: formData.get("max_discount"),
    min_total: formData.get("min_total"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    max_redemptions: formData.get("max_redemptions"),
    max_per_customer: formData.get("max_per_customer"),
    is_active: formData.get("is_active"),
  });
}

export async function createCoupon(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseCouponForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coupons")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    // The unique index is the only way to know the code is taken without a
    // second round trip that could race anyway.
    if (error.code === "23505") {
      return { fieldErrors: { code: ["هذا الرمز مستخدم بالفعل."] } };
    }
    console.error("[coupons] create failed", error);
    return { error: "تعذّر حفظ رمز الخصم الآن." };
  }

  await supabase.rpc("log_audit", {
    p_action: "coupon.create",
    p_entity_type: "coupon",
    p_entity_id: data.id,
    p_metadata: { code: parsed.data.code },
  });

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

export async function updateCoupon(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "رمز الخصم غير موجود." };

  const parsed = parseCouponForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("coupons").update(parsed.data).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { code: ["هذا الرمز مستخدم بالفعل."] } };
    }
    console.error("[coupons] update failed", error);
    return { error: "تعذّر تحديث رمز الخصم الآن." };
  }

  await supabase.rpc("log_audit", {
    p_action: "coupon.update",
    p_entity_type: "coupon",
    p_entity_id: id,
    p_metadata: { code: parsed.data.code },
  });

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

/**
 * Deactivates rather than deletes. Bookings reference the coupon they used,
 * and an operator asked "why was this booking 150 riyals cheaper" needs the
 * row to still be there to answer with.
 */
export async function toggleCouponActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("coupons").update({ is_active: active }).eq("id", id);

  if (error) {
    console.error("[coupons] toggle failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: active ? "coupon.activate" : "coupon.deactivate",
    p_entity_type: "coupon",
    p_entity_id: id,
  });

  revalidatePath("/admin/coupons");
}
