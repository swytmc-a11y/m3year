"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Every setting is stored as a one-element JSON array so the column can hold
 * numbers, booleans and strings without a type column beside it.
 */
const NUMERIC_KEYS = [
  "vat_rate",
  "weekly_threshold_days",
  "monthly_threshold_days",
  "payment_window_minutes",
  "confirmation_sla_hours",
  "cancellation_free_hours",
  "cancellation_late_refund_percent",
] as const;

const TEXT_KEYS = ["support_phone", "support_whatsapp", "currency"] as const;

export async function updateSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const rows: { key: string; value: Json }[] = [];

  for (const key of NUMERIC_KEYS) {
    const raw = String(formData.get(key) ?? "").trim();
    if (raw === "") continue;
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) {
      return { error: `القيمة المدخلة لـ ${key} غير صحيحة.` };
    }
    rows.push({ key, value: [n] });
  }

  for (const key of TEXT_KEYS) {
    const raw = String(formData.get(key) ?? "").trim();
    rows.push({ key, value: [raw] });
  }

  rows.push({ key: "prices_include_vat", value: [formData.get("prices_include_vat") === "on"] });

  const { error } = await supabase
    .from("app_settings")
    .upsert(rows.map((r) => ({ key: r.key, value: r.value, updated_at: new Date().toISOString() })));

  if (error) {
    console.error("[settings] update failed", error);
    return { error: "تعذّر حفظ الإعدادات الآن." };
  }

  await supabase.rpc("log_audit", { p_action: "settings.updated", p_entity_type: "settings" });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { success: true };
}
