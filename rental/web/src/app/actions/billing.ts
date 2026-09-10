"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

/**
 * The seller block printed on every tax invoice.
 *
 * These are snapshotted onto each invoice as it is issued, so changing them
 * affects invoices from here on and never rewrites one already issued. The
 * VAT number in particular is not cosmetic: it is encoded into the ZATCA QR,
 * and an empty one produces a QR that is structurally valid and legally
 * useless.
 */
export async function updateOrgSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const sellerName = String(formData.get("seller_name") ?? "").trim();
  const vatNumber = String(formData.get("vat_number") ?? "").trim();

  if (sellerName.length < 2) return { error: "أدخل اسم المنشأة." };
  // A Saudi VAT registration number is 15 digits, starting and ending with 3.
  if (vatNumber && !/^3\d{13}3$/.test(vatNumber)) {
    return { error: "الرقم الضريبي يجب أن يكون ١٥ رقمًا يبدأ وينتهي بالرقم ٣." };
  }

  const { error } = await supabase
    .from("org_settings")
    .update({
      seller_name: sellerName,
      vat_number: vatNumber,
      cr_number: String(formData.get("cr_number") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      postal_code: String(formData.get("postal_code") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    console.error("[billing] org update failed", error);
    return { error: "تعذّر حفظ بيانات المنشأة." };
  }

  revalidatePath("/admin/billing");
  return { success: true };
}

/**
 * The wallet and referral amounts.
 *
 * Kept in the database rather than the code because they are a marketing
 * dial the operator turns during a campaign, and a release should not be the
 * price of changing a bonus.
 */
export async function updateWalletSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();

  function amount(key: string): number | null {
    const raw = String(formData.get(key) ?? "").trim();
    const n = Number(raw);
    if (raw === "" || Number.isNaN(n) || n < 0) return null;
    return n;
  }

  const welcome = amount("welcome_bonus");
  const referral = amount("referral_bonus");
  const minTotal = amount("min_booking_total_to_redeem");
  const maxPercent = amount("max_redeem_percent");

  if (welcome === null || referral === null || minTotal === null || maxPercent === null) {
    return { error: "كل المبالغ يجب أن تكون أرقامًا موجبة." };
  }
  if (maxPercent > 100) return { error: "أقصى نسبة للصرف من الرصيد هي ١٠٠٪." };

  const { error } = await supabase
    .from("wallet_settings")
    .update({
      welcome_enabled: formData.get("welcome_enabled") === "on",
      welcome_bonus: welcome,
      referral_enabled: formData.get("referral_enabled") === "on",
      referral_bonus: referral,
      min_booking_total_to_redeem: minTotal,
      max_redeem_percent: maxPercent,
      require_phone_for_welcome: formData.get("require_phone_for_welcome") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    console.error("[billing] wallet update failed", error);
    return { error: "تعذّر حفظ إعدادات المحفظة." };
  }

  revalidatePath("/admin/billing");
  return { success: true };
}
