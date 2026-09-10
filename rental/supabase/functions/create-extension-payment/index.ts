// Starts payment for a booking extension.
//
// Mirrors create-booking-payment closely, with one structural difference:
// an extension is invoiced as its own segment (see request_extension() and
// issue_invoice_for_extension() in the database), so it is also PAID as its
// own charge here — never folded into the original booking's total, which
// is already settled and already has its own invoice.
//
// What this function will NOT trust from the caller:
//   - the amount. Read from booking_extensions, which request_extension()
//     priced server-side when the extension was requested.
//   - ownership. The extension is read by joining through bookings, which
//     RLS scopes to the caller's own rows.

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
    console.error("[create-extension-payment] unhandled error", err);
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

  let body: { extensionId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid request body" }, 400);
  }

  const extensionId = typeof body.extensionId === "string" ? body.extensionId : null;
  if (!extensionId) {
    return json({ error: "extensionId is required" }, 400);
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

  // Read through the user's own client: booking_extensions_select_own scopes
  // this to bookings the caller owns, exactly like create-booking-payment.
  const { data: extension, error: extensionError } = await asUser
    .from("booking_extensions")
    .select(
      "id, amount, payment_status, booking:bookings(id, reference, customer_id, car:cars(make, model, year))",
    )
    .eq("id", extensionId)
    .maybeSingle();

  if (extensionError) {
    console.error("[create-extension-payment] lookup failed", extensionError);
    return json({ error: "تعذّر التحقق من التمديد." }, 500);
  }

  const booking = extension?.booking as unknown as
    | { id: string; reference: string; customer_id: string; car: { make: string; model: string; year: number } | null }
    | null;

  if (!extension || !booking || booking.customer_id !== userData.user.id) {
    return json({ error: "لم يتم العثور على التمديد." }, 404);
  }
  if (extension.payment_status === "paid") {
    return json({ error: "هذا التمديد مدفوع بالفعل." }, 409);
  }

  const moyasarKey = Deno.env.get("MOYASAR_SECRET_KEY");
  if (!moyasarKey) {
    console.warn("[create-extension-payment] no payment provider configured");
    return json({ error: "خدمة الدفع غير مفعّلة حاليًا." }, 503);
  }

  const amountHalalas = Math.round(Number(extension.amount) * 100);
  if (!Number.isFinite(amountHalalas) || amountHalalas <= 0) {
    console.error("[create-extension-payment] refusing implausible amount", extension.amount);
    return json({ error: "قيمة التمديد غير صحيحة." }, 500);
  }

  const description = booking.car
    ? `تمديد حجز ${booking.reference} — ${booking.car.make} ${booking.car.model} ${booking.car.year}`
    : `تمديد حجز ${booking.reference}`;

  // metadata carries extension_id rather than booking_id — the shared
  // webhook branches on which key is present, since an extension is its own
  // charge and must never be mistaken for the original booking's payment.
  const invoicePayload = {
    amount: amountHalalas,
    currency: "SAR",
    description,
    callback_url: `${supabaseUrl}/functions/v1/moyasar-booking-webhook`,
    success_url: `${supabaseUrl}/functions/v1/moyasar-booking-webhook/return`,
    back_url: `${supabaseUrl}/functions/v1/moyasar-booking-webhook/return`,
    metadata: { extension_id: extension.id, booking_id: booking.id, reference: booking.reference },
  };

  const res = await fetch(MOYASAR_INVOICE_API, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${moyasarKey}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(invoicePayload),
  });

  const invoice = await res.json().catch(() => null);

  if (!res.ok || !invoice) {
    console.error("[create-extension-payment] moyasar rejected invoice", res.status, JSON.stringify(invoice));
    return json({ error: "تعذّر إنشاء فاتورة الدفع. حاول مرة أخرى." }, 502);
  }

  const paymentUrl: string | null =
    invoice.url ?? invoice.invoice_url ?? invoice?.source?.transaction_url ?? null;

  if (!paymentUrl) {
    console.error("[create-extension-payment] no payment url in invoice", JSON.stringify(invoice));
    return json({ error: "تعذّر فتح صفحة الدفع. حاول مرة أخرى." }, 502);
  }

  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  await asAdmin
    .from("booking_extensions")
    .update({ payment_ref: invoice.id ?? null })
    .eq("id", extension.id);

  return json({ paymentUrl, extensionId: extension.id });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
