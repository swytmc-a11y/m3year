"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { TablesUpdate } from "@/lib/supabase/database.types";

function revalidateBookingSurfaces() {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/today");
  revalidatePath("/admin");
}

async function notify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  title: string,
  body: string,
  bookingId: string,
  action?: "review",
) {
  // Best-effort: a booking transition must not fail because a notification
  // row could not be written.
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    category: "booking_updates",
    title,
    body,
    data: { booking_id: bookingId, ...(action ? { action } : {}) },
  });
  if (error) console.error("[bookings] notify failed", error);
}

type BookingUpdate = TablesUpdate<"bookings">;

/**
 * Moves a booking along its lifecycle. Every transition is written here
 * rather than trusted from the client, and each one is audited.
 */
async function transition(
  bookingId: string,
  next: "confirmed" | "rejected" | "active" | "completed" | "cancelled",
  extra: BookingUpdate = {},
) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference, customer_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return;

  const patch: BookingUpdate = { status: next, ...extra };
  if (next === "confirmed") patch.confirmed_at = new Date().toISOString();
  if (next === "cancelled" || next === "rejected") patch.cancelled_at = new Date().toISOString();

  const { error } = await supabase.from("bookings").update(patch).eq("id", bookingId);
  if (error) {
    console.error("[bookings] transition failed", error);
    return;
  }

  const messages: Record<typeof next, [string, string]> = {
    confirmed: ["تم تأكيد حجزك", `حجزك ${booking.reference} مؤكد. نراك في الفرع.`],
    rejected: ["تعذّر تأكيد حجزك", `نعتذر، لم نتمكن من تأكيد الحجز ${booking.reference}.`],
    active: ["بدأ الإيجار", `تم تسليمك السيارة — حجز ${booking.reference}.`],
    completed: ["انتهى الإيجار", `شكرًا لك. نسعد بتقييمك لتجربة الحجز ${booking.reference}.`],
    cancelled: ["أُلغي الحجز", `تم إلغاء الحجز ${booking.reference}.`],
  };
  const [title, body] = messages[next];
  await notify(
    supabase,
    booking.customer_id,
    title,
    body,
    bookingId,
    next === "completed" ? "review" : undefined,
  );

  await supabase.rpc("log_audit", {
    p_action: `booking.${next}`,
    p_entity_type: "booking",
    p_entity_id: bookingId,
    p_metadata: { from: booking.status },
  });

  revalidateBookingSurfaces();
}

export async function confirmBooking(formData: FormData) {
  await transition(String(formData.get("id")), "confirmed");
}

export async function rejectBooking(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim() || null;
  await transition(String(formData.get("id")), "rejected", { cancellation_reason: reason });
}

/** Car handed over at the counter. */
export async function startBooking(formData: FormData) {
  await transition(String(formData.get("id")), "active");
}

/** Car returned. Frees the dates for the next customer. */
export async function completeBooking(formData: FormData) {
  await transition(String(formData.get("id")), "completed");
}

export async function cancelBookingAsAdmin(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim() || null;
  await transition(String(formData.get("id")), "cancelled", { cancellation_reason: reason });
}

/**
 * Records that a refund was issued. The money movement itself happens in the
 * payment provider; this keeps the booking honest about it rather than
 * leaving a cancelled-but-still-"paid" row behind.
 */
export async function markRefunded(formData: FormData) {
  await requireAdmin();
  const bookingId = String(formData.get("id"));
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw === "" ? null : Number(amountRaw);
  if (amount != null && (Number.isNaN(amount) || amount < 0)) return;

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("total")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return;

  const refund = amount ?? Number(booking.total);
  const full = refund >= Number(booking.total);

  const { error } = await supabase
    .from("bookings")
    .update({
      payment_status: full ? "refunded" : "partially_refunded",
      refund_amount: refund,
      refunded_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    console.error("[bookings] refund mark failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: "booking.refunded",
    p_entity_type: "booking",
    p_entity_id: bookingId,
    p_metadata: { amount: refund, full },
  });

  revalidateBookingSurfaces();
}

export async function saveBookingNote(formData: FormData) {
  await requireAdmin();
  const bookingId = String(formData.get("id"));
  const note = String(formData.get("admin_note") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase.from("bookings").update({ admin_note: note }).eq("id", bookingId);
  revalidateBookingSurfaces();
}
