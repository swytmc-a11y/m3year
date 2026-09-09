// Starts payment for a booking.
//
// What this function will NOT trust from the caller:
//   - the amount. It is read from the booking row, which froze its own
//     pricing snapshot when quote_booking() priced it. A tampered client can
//     ask to pay for booking X but cannot claim X costs 1 halala.
//   - ownership. The booking is read through the caller's own JWT, so RLS
//     decides whether they can see it at all. Someone else's booking simply
//     is not found.
//
// Card data never touches this code or the app: Moyasar hosts the payment
// page and we only ever hold the invoice id and its URL, which keeps the
// whole product out of PCI scope.
//
// The booking is marked paid by the webhook after Moyasar confirms it —
// never here, and never by trusting the client's return from the payment
// page.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MOYASAR_INVOICE_API = "https://api.moyasar.com/v1/invoices";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[create-booking-payment] unhandled error", err);
    return json({ error: "تعذّر بدء عملية الدفع الآن. حاول مرة أخرى." }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let body: { bookingId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid request body" }, 400);
  }

  const bookingId = typeof body.bookingId === "string" ? body.bookingId : null;
  if (!bookingId) {
    return json({ error: "bookingId is required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "لم يتم التعرّف على الجلسة." }, 401);
  }

  // Read through the user's own client: RLS, not a claim in the request,
  // decides whether this booking belongs to them.
  const { data: booking, error: bookingError } = await asUser
    .from("bookings")
    .select("id, reference, total, status, payment_status, customer_id, car:cars(make, model, year)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error("[create-booking-payment] booking lookup failed", bookingError);
    return json({ error: "تعذّر التحقق من الحجز." }, 500);
  }
  if (!booking || booking.customer_id !== userData.user.id) {
    return json({ error: "لم يتم العثور على الحجز." }, 404);
  }
  if (booking.payment_status === "paid") {
    return json({ error: "هذا الحجز مدفوع بالفعل." }, 409);
  }
  if (booking.status !== "pending_payment") {
    return json({ error: "لا يمكن دفع هذا الحجز في حالته الحالية." }, 409);
  }

  const moyasarKey = Deno.env.get("MOYASAR_SECRET_KEY");
  if (!moyasarKey) {
    // Stays dormant until a provider key is configured, rather than failing
    // in a way that looks like a bug.
    console.warn("[create-booking-payment] no payment provider configured");
    return json({ error: "خدمة الدفع غير مفعّلة حاليًا." }, 503);
  }

  // Moyasar bills in the smallest unit. The booking stores riyals, and the
  // total is VAT-inclusive already.
  const amountHalalas = Math.round(Number(booking.total) * 100);
  if (!Number.isFinite(amountHalalas) || amountHalalas <= 0) {
    console.error("[create-booking-payment] refusing implausible amount", booking.total);
    return json({ error: "قيمة الحجز غير صحيحة." }, 500);
  }

  const car = booking.car as unknown as { make: string; model: string; year: number } | null;
  const description = car
    ? `حجز ${booking.reference} — ${car.make} ${car.model} ${car.year}`
    : `حجز ${booking.reference}`;

  // metadata comes back on the webhook, and is how a confirmed payment is
  // tied to its booking without trusting anything the client sends then.
  const invoicePayload = {
    amount: amountHalalas,
    currency: "SAR",
    description,
    callback_url: `${supabaseUrl}/functions/v1/moyasar-booking-webhook`,
    success_url: `${supabaseUrl}/functions/v1/moyasar-booking-webhook/return`,
    back_url: `${supabaseUrl}/functions/v1/moyasar-booking-webhook/return`,
    metadata: { booking_id: booking.id, reference: booking.reference },
  };

  const res = await fetch(MOYASAR_INVOICE_API, {
    method: "POST",
    headers: {
      // Moyasar uses HTTP Basic with the secret key as the username and an
      // empty password.
      Authorization: `Basic ${btoa(`${moyasarKey}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(invoicePayload),
  });

  const invoice = await res.json().catch(() => null);

  if (!res.ok || !invoice) {
    console.error("[create-booking-payment] moyasar rejected invoice", res.status, JSON.stringify(invoice));
    return json({ error: "تعذّر إنشاء فاتورة الدفع. حاول مرة أخرى." }, 502);
  }

  const paymentUrl: string | null =
    invoice.url ?? invoice.invoice_url ?? invoice?.source?.transaction_url ?? null;

  if (!paymentUrl) {
    console.error("[create-booking-payment] no payment url in invoice", JSON.stringify(invoice));
    return json({ error: "تعذّر فتح صفحة الدفع. حاول مرة أخرى." }, 502);
  }

  // Written with the service role because bookings has no policy letting a
  // customer set payment fields — if it did, anyone could mark their own
  // booking paid.
  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  await asAdmin
    .from("bookings")
    .update({ payment_ref: invoice.id ?? null })
    .eq("id", booking.id);

  return json({ paymentUrl, bookingId: booking.id });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
