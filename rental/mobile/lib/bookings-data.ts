import { supabase } from "@/lib/supabase";
import type { BookingStatus, PaymentStatus, RateTier } from "@/lib/constants";

export type MyBooking = {
  id: string;
  reference: string;
  start_date: string;
  end_date: string;
  pickup_time: string;
  return_time: string;
  days: number;
  rate_tier: RateTier;
  daily_rate: number;
  rental_total: number;
  addons_total: number;
  vat_amount: number;
  total: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  cancellation_reason: string | null;
  customer_note: string | null;
  car: { id: string; make: string; model: string; year: number; cover_image: string | null } | null;
  branch: {
    name: string;
    city: string;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    deposit_note: string | null;
  } | null;
};

const SELECT =
  "id, reference, start_date, end_date, pickup_time, return_time, days, rate_tier, daily_rate, rental_total, addons_total, vat_amount, total, status, payment_status, cancellation_reason, customer_note, car:cars(id, make, model, year, cover_image), branch:branches(name, city, address, phone, whatsapp, deposit_note)";

/** RLS scopes this to the signed-in customer, so no filter is needed here. */
export async function listMyBookings(): Promise<MyBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(SELECT)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("[bookings] load failed", error);
    return [];
  }
  return (data ?? []) as unknown as MyBooking[];
}

export async function fetchBooking(id: string): Promise<MyBooking | null> {
  const { data, error } = await supabase.from("bookings").select(SELECT).eq("id", id).maybeSingle();
  if (error) {
    console.error("[bookings] fetch failed", error);
    return null;
  }
  return (data as unknown as MyBooking) ?? null;
}

export type BookingAddonLine = { addon_id: string; name: string; total: number };

export async function fetchBookingAddons(bookingId: string): Promise<BookingAddonLine[]> {
  const { data } = await supabase
    .from("booking_addons")
    .select("addon_id, name, total")
    .eq("booking_id", bookingId);
  return (data ?? []) as unknown as BookingAddonLine[];
}

/** Statuses where the rental has not happened yet or is happening now. */
export const OPEN_STATUSES: BookingStatus[] = [
  "pending_payment",
  "pending_confirmation",
  "confirmed",
  "active",
];

/**
 * The rental the customer is living right now, or the next one they are
 * about to collect.
 *
 * This is what the home screen leads with: someone who already has the car
 * does not want a shelf of cars to book, they want the return date, the
 * branch's number and a way to keep it longer.
 */
export async function fetchCurrentRental(): Promise<MyBooking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(SELECT)
    .in("status", ["confirmed", "active"])
    .order("start_date", { ascending: true })
    .limit(1);

  if (error) {
    console.error("[bookings] current rental failed", error);
    return null;
  }
  return ((data ?? [])[0] as unknown as MyBooking) ?? null;
}
