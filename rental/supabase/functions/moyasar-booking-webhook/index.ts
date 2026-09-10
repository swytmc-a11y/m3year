// Receives Moyasar payment notifications and confirms whatever was paid for:
// a booking, or a booking extension. Both share this one endpoint (Moyasar
// is configured with a single callback URL), and the metadata on the
// invoice — set when the payment was started — says which it is.
//
// This is the only place in the system that can mark either one paid, so it
// is written defensively:
//
//   1. verify_jwt MUST be disabled for this function (Moyasar is not a
//      Supabase user and sends no JWT). That means the URL is publicly
//      reachable, so the shared secret below is the actual authentication.
//      A request without the right secret is rejected before anything else.
//
//   2. The webhook body is NOT trusted for the amount or the status. After
//      the secret checks out, the payment is re-fetched from Moyasar's API
//      with our secret key, and whichever row advances only if Moyasar
//      itself reports it paid, for the amount that row actually says. A
//      forged body that guessed the secret still cannot confirm anything.
//
//   3. Advancing is idempotent. Webhooks retry, and a retry must not
//      double-apply — each UPDATE is conditional on the row still being
//      unpaid.
//
// Where a BOOKING lands after payment depends on the car: one set to
// instant confirmation is confirmed outright, one left on manual goes to
// the branch for a human decision. An EXTENSION has no such branch — the
// booking it belongs to already exists and is already confirmed; paying an
// extension only marks it paid and issues its own invoice.

import { createClient } from "jsr:@supabase/supabase-js@2";

const MOYASAR_PAYMENT_API = "https://api.moyasar.com/v1/payments";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[moyasar-booking-webhook] unhandled error", err);
    // 500 asks Moyasar to retry, which is what we want for a transient fault.
    return json({ error: "internal error" }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  // The customer's browser is sent here after the hosted page. Nothing is
  // decided from this landing — it exists only so they see something human.
  if (req.method === "GET") {
    return new Response(RETURN_PAGE, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("MOYASAR_WEBHOOK_SECRET");
  const moyasarKey = Deno.env.get("MOYASAR_SECRET_KEY");
  if (!expectedSecret || !moyasarKey) {
    console.warn("[moyasar-booking-webhook] secrets not configured");
    return json({ error: "not configured" }, 503);
  }

  let body: { type?: string; secret_token?: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid body" }, 400);
  }

  const presentedSecret = body.secret_token ?? req.headers.get("x-moyasar-secret") ?? "";
  if (!timingSafeEqual(presentedSecret, expectedSecret)) {
    console.warn("[moyasar-booking-webhook] rejected: bad secret");
    return json({ error: "unauthorized" }, 401);
  }

  const payment = (body.data ?? {}) as {
    id?: string;
    metadata?: Record<string, unknown>;
  };
  const paymentId = typeof payment.id === "string" ? payment.id : null;
  const extensionId = typeof payment.metadata?.extension_id === "string"
    ? (payment.metadata.extension_id as string)
    : null;
  const bookingId = typeof payment.metadata?.booking_id === "string"
    ? (payment.metadata.booking_id as string)
    : null;

  if (!paymentId || (!bookingId && !extensionId)) {
    // Nothing actionable, but it authenticated — don't ask for a retry.
    console.warn("[moyasar-booking-webhook] missing payment id or target", body.type);
    return json({ ok: true });
  }

  // The webhook told us which payment; Moyasar tells us whether it is real.
  const verifyRes = await fetch(`${MOYASAR_PAYMENT_API}/${paymentId}`, {
    headers: { Authorization: `Basic ${btoa(`${moyasarKey}:`)}` },
  });
  const verified = await verifyRes.json().catch(() => null);

  if (!verifyRes.ok || !verified) {
    console.error("[moyasar-booking-webhook] verify failed", verifyRes.status);
    return json({ error: "verify failed" }, 500);
  }
  if (verified.status !== "paid") {
    console.warn("[moyasar-booking-webhook] payment not paid", paymentId, verified.status);
    return json({ ok: true });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // An extension invoice always carries booking_id alongside extension_id
  // (create-extension-payment sets both), so the extension branch is checked
  // first — it is the more specific of the two.
  if (extensionId) {
    return await confirmExtensionPayment(asAdmin, extensionId, paymentId, Number(verified.amount));
  }
  return await confirmBookingPayment(asAdmin, bookingId!, paymentId, Number(verified.amount));
}

async function confirmBookingPayment(
  asAdmin: ReturnType<typeof createClient>,
  bookingId: string,
  paymentId: string,
  paidHalalas: number,
): Promise<Response> {
  const { data: booking, error: bookingError } = await asAdmin
    .from("bookings")
    .select("id, reference, total, status, customer_id, car:cars(confirmation_mode)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    console.error("[moyasar-booking-webhook] booking not found", bookingId, bookingError);
    return json({ ok: true });
  }

  // Paying less than the booking costs must never confirm it.
  const expectedHalalas = Math.round(Number(booking.total) * 100);
  if (paidHalalas < expectedHalalas) {
    console.error(
      "[moyasar-booking-webhook] amount mismatch",
      bookingId,
      paidHalalas,
      expectedHalalas,
    );
    return json({ ok: true });
  }

  const car = booking.car as unknown as { confirmation_mode: "instant" | "manual" } | null;
  const nextStatus = car?.confirmation_mode === "instant" ? "confirmed" : "pending_confirmation";

  // Conditional on pending_payment: a retried webhook finds nothing to do.
  const { data: updated, error: updateError } = await asAdmin
    .from("bookings")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_ref: paymentId,
      status: nextStatus,
      ...(nextStatus === "confirmed" ? { confirmed_at: new Date().toISOString() } : {}),
    })
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .select("id");

  if (updateError) {
    console.error("[moyasar-booking-webhook] update failed", updateError);
    return json({ error: "update failed" }, 500);
  }
  if (!updated || updated.length === 0) {
    // Already applied by an earlier delivery.
    return json({ ok: true, alreadyApplied: true });
  }

  await asAdmin.from("notifications").insert({
    user_id: booking.customer_id,
    category: "booking_updates",
    title: nextStatus === "confirmed" ? "تم تأكيد حجزك" : "تم استلام دفعتك",
    body:
      nextStatus === "confirmed"
        ? `حجزك ${booking.reference} مؤكد. نراك في الفرع.`
        : `استلمنا دفعة حجزك ${booking.reference}، وهو الآن بانتظار تأكيد الفرع.`,
    data: { booking_id: booking.id },
  });

  return json({ ok: true });
}

async function confirmExtensionPayment(
  asAdmin: ReturnType<typeof createClient>,
  extensionId: string,
  paymentId: string,
  paidHalalas: number,
): Promise<Response> {
  const { data: extension, error: extensionError } = await asAdmin
    .from("booking_extensions")
    .select("id, amount, payment_status, booking:bookings(id, reference, customer_id)")
    .eq("id", extensionId)
    .maybeSingle();

  if (extensionError || !extension) {
    console.error("[moyasar-booking-webhook] extension not found", extensionId, extensionError);
    return json({ ok: true });
  }

  const booking = extension.booking as unknown as
    | { id: string; reference: string; customer_id: string }
    | null;
  if (!booking) {
    console.error("[moyasar-booking-webhook] extension has no booking", extensionId);
    return json({ ok: true });
  }

  const expectedHalalas = Math.round(Number(extension.amount) * 100);
  if (paidHalalas < expectedHalalas) {
    console.error(
      "[moyasar-booking-webhook] extension amount mismatch",
      extensionId,
      paidHalalas,
      expectedHalalas,
    );
    return json({ ok: true });
  }

  // Conditional on unpaid: a retried webhook finds nothing to do. The
  // update trigger issue_extension_invoice_on_payment() fires from this
  // same statement and raises the extension's own tax invoice.
  const { data: updated, error: updateError } = await asAdmin
    .from("booking_extensions")
    .update({ payment_status: "paid", paid_at: new Date().toISOString(), payment_ref: paymentId })
    .eq("id", extensionId)
    .eq("payment_status", "unpaid")
    .select("id");

  if (updateError) {
    console.error("[moyasar-booking-webhook] extension update failed", updateError);
    return json({ error: "update failed" }, 500);
  }
  if (!updated || updated.length === 0) {
    return json({ ok: true, alreadyApplied: true });
  }

  await asAdmin.from("notifications").insert({
    user_id: booking.customer_id,
    category: "booking_updates",
    title: "تم دفع تمديد الحجز",
    body: `استلمنا دفعة تمديد حجزك ${booking.reference}.`,
    data: { booking_id: booking.id },
  });

  return json({ ok: true });
}

/** Constant-time compare, so a wrong secret leaks nothing through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const RETURN_PAGE = `<!doctype html>
<html lang="ar" dir="rtl">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>تمت العملية</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         background:#f5f5f1; color:#14161a; font-family: system-ui, sans-serif; }
  .card { text-align:center; padding:32px 24px; max-width:22rem; }
  h1 { font-size:1.25rem; margin:0 0 .5rem; }
  p { color:#6b7075; line-height:1.8; margin:0; font-size:.9rem; }
</style>
<div class="card">
  <h1>تمت العملية</h1>
  <p>يمكنك العودة إلى التطبيق الآن — ستجد حالة حجزك محدّثة في «حجوزاتي».</p>
</div>
</html>`;
