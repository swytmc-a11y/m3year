import { supabase } from "@/lib/supabase";
import type { Quote } from "@/lib/car-detail";

export type CreateBookingInput = {
  carId: string;
  branchId: string;
  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  quote: Quote;
  note: string | null;
  confirmationMode: "instant" | "manual";
};

/**
 * Creates the booking from a server-issued quote.
 *
 * The amounts written here come from quote_booking() rather than from
 * anything the client computed, and the row is inserted with the whole
 * pricing snapshot so a later price change cannot rewrite what was agreed.
 * If the dates were taken in the meantime the database refuses the insert
 * outright — the exclusion constraint, not a check this code performs.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<{ bookingId?: string; reference?: string; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const q = input.quote;

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      // Filled by a trigger; the column is NOT NULL so it needs a value here.
      reference: "",
      car_id: input.carId,
      branch_id: input.branchId,
      customer_id: user.id,
      start_date: input.startDate,
      end_date: input.endDate,
      pickup_time: input.pickupTime,
      return_time: input.returnTime,
      days: q.days,
      rate_tier: q.rate_tier,
      daily_rate: q.daily_rate,
      rental_total: q.rental_total,
      addons_total: q.addons_total,
      vat_rate: q.vat_rate,
      vat_amount: q.vat_amount,
      total: q.total,
      customer_note: input.note,
      // Payment comes next; until it lands the booking holds the dates only
      // for the configured window, after which the sweep releases them.
      status: "pending_payment",
    })
    .select("id, reference")
    .single();

  if (error) {
    const message = error.message ?? "";
    if (message.includes("bookings_no_overlap") || message.includes("exclusion")) {
      return { error: "حُجزت هذه السيارة في التواريخ المختارة قبل قليل. اختر فترة أخرى." };
    }
    if (message.includes("car_unavailable_maintenance")) {
      return { error: "السيارة في الصيانة خلال هذه الفترة." };
    }
    console.error("[booking] create failed", error);
    return { error: "تعذّر إنشاء الحجز الآن. حاول مرة أخرى." };
  }

  if (q.addons.length > 0) {
    const { error: addonError } = await supabase.from("booking_addons").insert(
      q.addons.map((a) => ({
        booking_id: data.id,
        addon_id: a.addon_id,
        name: a.name,
        pricing_type: "per_day" as const,
        unit_price: 0,
        total: a.total,
      })),
    );
    if (addonError) console.error("[booking] addons failed", addonError);
  }

  return { bookingId: data.id, reference: data.reference };
}

export async function cancelMyBooking(bookingId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: "ألغاه العميل",
    })
    .eq("id", bookingId);

  if (error) {
    console.error("[booking] cancel failed", error);
    return { error: "تعذّر إلغاء الحجز الآن." };
  }
  return {};
}

/**
 * Opens payment for a booking.
 *
 * The amount is never sent from here — the edge function reads it from the
 * booking's own frozen pricing snapshot. This returns the hosted page URL;
 * the booking is only marked paid once Moyasar confirms it to the webhook,
 * never from the customer's return to the app.
 */
export async function startBookingPayment(
  bookingId: string,
): Promise<{ paymentUrl?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("create-booking-payment", {
    body: { bookingId },
  });

  if (error) {
    console.error("[booking] payment start failed", error);
    return { error: "تعذّر فتح صفحة الدفع الآن. حاول مرة أخرى." };
  }
  const res = data as { paymentUrl?: string; error?: string } | null;
  if (res?.error) return { error: res.error };
  if (!res?.paymentUrl) return { error: "تعذّر فتح صفحة الدفع الآن." };
  return { paymentUrl: res.paymentUrl };
}
