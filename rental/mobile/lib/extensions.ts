import { supabase } from "@/lib/supabase";

export type ExtensionQuote =
  | {
      ok: true;
      from: string;
      to: string;
      days_added: number;
      rate_tier: string;
      daily_rate: number;
      amount: number;
      vat_rate: number;
      vat_amount: number;
      total_days_after: number;
      extension_id?: string;
    }
  | { ok: false; reason: string; current_end?: string; status?: string };

/** Why an extension was refused, in the customer's language. */
export const EXTENSION_REASONS: Record<string, string> = {
  booking_not_found: "الحجز غير موجود.",
  status_not_extendable: "لا يمكن تمديد هذا الحجز في حالته الحالية.",
  end_date_not_later: "اختر تاريخًا بعد تاريخ التسليم الحالي.",
  car_taken: "السيارة محجوزة لعميل آخر في هذه الفترة.",
  car_blocked: "السيارة غير متاحة في هذه الفترة.",
};

export function extensionMessage(reason: string): string {
  return EXTENSION_REASONS[reason] ?? "تعذّر تمديد الحجز.";
}

function hydrate(raw: unknown): ExtensionQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  if (!q.ok) return q as unknown as ExtensionQuote;
  return {
    ...(q as unknown as Extract<ExtensionQuote, { ok: true }>),
    days_added: Number(q.days_added),
    daily_rate: Number(q.daily_rate),
    amount: Number(q.amount),
    vat_rate: Number(q.vat_rate),
    vat_amount: Number(q.vat_amount),
    total_days_after: Number(q.total_days_after),
  };
}

/** What extending to `newEnd` would cost, and whether the car is even free. */
export async function quoteExtension(
  bookingId: string,
  newEnd: string,
): Promise<ExtensionQuote | null> {
  const { data, error } = await supabase.rpc("quote_extension", {
    p_booking: bookingId,
    p_new_end: newEnd,
  });
  if (error) {
    console.error("[extensions] quote failed", error);
    return null;
  }
  return hydrate(data);
}

/**
 * Commits the extension.
 *
 * The quote is re-run server-side inside this call, so a car that was taken
 * between showing the price and tapping confirm comes back as `car_taken`
 * rather than being double-booked.
 */
export async function requestExtension(
  bookingId: string,
  newEnd: string,
): Promise<ExtensionQuote | null> {
  const { data, error } = await supabase.rpc("request_extension", {
    p_booking: bookingId,
    p_new_end: newEnd,
  });
  if (error) {
    console.error("[extensions] request failed", error);
    return null;
  }
  return hydrate(data);
}

export type BookingExtension = {
  id: string;
  previous_end_date: string;
  new_end_date: string;
  days_added: number;
  amount: number;
  payment_status: string;
};

export async function listBookingExtensions(
  bookingId: string,
): Promise<BookingExtension[]> {
  const { data, error } = await supabase
    .from("booking_extensions")
    .select("id, previous_end_date, new_end_date, days_added, amount, payment_status")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
}
