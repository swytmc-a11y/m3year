import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export type WalletEntryKind = Database["public"]["Enums"]["wallet_entry_kind"];

export type WalletEntry = {
  id: string;
  kind: WalletEntryKind;
  amount: number;
  note: string | null;
  booking_id: string | null;
  created_at: string;
};

export type WalletSettings = {
  welcome_enabled: boolean;
  welcome_bonus: number;
  referral_enabled: boolean;
  referral_bonus: number;
  min_booking_total_to_redeem: number;
  max_redeem_percent: number;
  require_phone_for_welcome: boolean;
};

/** What each ledger line is called on the customer's own statement. */
export const WALLET_KIND_LABELS: Record<WalletEntryKind, string> = {
  welcome_bonus: "رصيد ترحيبي",
  referral_bonus: "مكافأة دعوة",
  booking_redeem: "خصم على حجز",
  booking_refund: "إعادة رصيد حجز ملغى",
  admin_credit: "إضافة رصيد",
  admin_debit: "خصم رصيد",
  expiry: "انتهاء صلاحية رصيد",
};

/**
 * The spendable balance, from the server.
 *
 * Deliberately not summed on the client from the rows below: a booking that
 * is still pending holds its credit, and only the database knows the whole
 * ledger — a client-side sum of one page of rows would overstate it.
 */
export async function fetchWalletBalance(): Promise<number> {
  const { data, error } = await supabase.rpc("wallet_balance", {});
  if (error) {
    console.error("[wallet] balance failed", error);
    return 0;
  }
  return Number(data ?? 0);
}

export async function listWalletEntries(limit = 50): Promise<WalletEntry[]> {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, kind, amount, note, booking_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[wallet] entries failed", error);
    return [];
  }
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function fetchWalletSettings(): Promise<WalletSettings | null> {
  const { data, error } = await supabase
    .from("wallet_settings")
    .select(
      "welcome_enabled, welcome_bonus, referral_enabled, referral_bonus, min_booking_total_to_redeem, max_redeem_percent, require_phone_for_welcome",
    )
    .maybeSingle();

  if (error || !data) return null;
  return {
    welcome_enabled: data.welcome_enabled,
    welcome_bonus: Number(data.welcome_bonus),
    referral_enabled: data.referral_enabled,
    referral_bonus: Number(data.referral_bonus),
    min_booking_total_to_redeem: Number(data.min_booking_total_to_redeem),
    max_redeem_percent: Number(data.max_redeem_percent),
    require_phone_for_welcome: data.require_phone_for_welcome,
  };
}
