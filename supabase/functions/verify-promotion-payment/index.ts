// Miyar (معيار) — confirms a Paylink payment and applies the promotion.
//
// Paylink returns the customer to a callBackUrl in their browser rather than
// calling us server-to-server, and a redirect the customer's device controls
// is not evidence that anything was paid. So nothing here trusts the return
// URL: the app reports "I came back from order X", and this function asks
// Paylink directly what actually happened to X.
//
// That makes the flow safe without a webhook at all — the confirmation always
// travels over our own authenticated connection to Paylink.
//
// Idempotent: only an order still 'pending' is advanced, and the update is
// conditional on that, so re-opening the app or a double tap cannot extend a
// promotion twice.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_BASE = "https://restapi.paylink.sa";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[verify-promotion-payment] unhandled error", err);
    return json({ error: "تعذّر التحقق من الدفع الآن." }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const orderId = typeof body?.orderId === "string" ? body.orderId : null;
  if (!orderId) return json({ error: "orderId is required" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: userData } = await asUser.auth.getUser();
  if (!userData?.user) return json({ error: "لم يتم التعرّف على الجلسة." }, 401);

  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: order } = await asAdmin
    .from("promotion_orders")
    .select("id, user_id, target_type, target_id, plan_code, amount_halalas, status, provider_invoice_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return json({ error: "لم يتم العثور على الطلب." }, 404);
  // A caller may only ever ask about their own order.
  if (order.user_id !== userData.user.id) return json({ error: "لم يتم العثور على الطلب." }, 404);

  if (order.status === "paid") return json({ status: "paid", applied: false, alreadyPaid: true });
  if (order.status !== "pending") return json({ status: order.status, applied: false });

  const apiId = Deno.env.get("PAYLINK_API_ID");
  const secretKey = Deno.env.get("PAYLINK_SECRET_KEY");
  const base = Deno.env.get("PAYLINK_BASE_URL") ?? DEFAULT_BASE;
  if (!apiId || !secretKey) return json({ error: "خدمة الدفع غير مفعّلة حاليًا." }, 503);
  if (!order.provider_invoice_id) return json({ status: "pending", applied: false });

  const token = await paylinkAuth(base, apiId, secretKey);
  if (!token) return json({ error: "تعذّر الاتصال ببوابة الدفع." }, 502);

  const invRes = await fetch(
    `${base}/api/getInvoice/${encodeURIComponent(order.provider_invoice_id)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  const invoice = await invRes.json().catch(() => null);

  if (!invRes.ok || !invoice) {
    console.error("[verify-promotion-payment] getInvoice failed", invRes.status, invoice);
    return json({ error: "تعذّر التحقق من حالة الدفع." }, 502);
  }

  // Paylink reports Paid / Pending / Cancelled / Failed on orderStatus.
  const status = String(invoice.orderStatus ?? invoice.status ?? "").toLowerCase();
  console.log("[verify-promotion-payment] order", order.id, "paylink status", status);

  if (status !== "paid") {
    if (status === "cancelled" || status === "failed" || status === "expired") {
      await asAdmin
        .from("promotion_orders")
        .update({ status: status === "failed" ? "failed" : "cancelled", failure_reason: `paylink_${status}` })
        .eq("id", order.id)
        .eq("status", "pending");
    }
    return json({ status, applied: false });
  }

  // Paylink bills in riyals; our orders are stored in halalas. Compare in
  // halalas so a partial payment cannot buy a full promotion.
  const paidHalalas = Math.round(Number(invoice.amount ?? 0) * 100);
  if (paidHalalas !== order.amount_halalas) {
    console.error("[verify-promotion-payment] amount mismatch", paidHalalas, order.amount_halalas);
    await asAdmin
      .from("promotion_orders")
      .update({ status: "failed", failure_reason: `amount_mismatch_${paidHalalas}` })
      .eq("id", order.id)
      .eq("status", "pending");
    return json({ status: "amount_mismatch", applied: false }, 200);
  }

  const { data: plan } = await asAdmin
    .from("promotion_plans")
    .select("duration_days")
    .eq("code", order.plan_code)
    .maybeSingle();

  const from = new Date();
  const until = new Date(from.getTime() + (plan?.duration_days ?? 7) * 24 * 60 * 60 * 1000);

  const { data: claimed } = await asAdmin
    .from("promotion_orders")
    .update({
      status: "paid",
      provider_payment_id: String(invoice.transactionNo ?? order.provider_invoice_id),
      paid_at: from.toISOString(),
      featured_from: from.toISOString(),
      featured_until: until.toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id");

  // Another call won the race and already applied it.
  if (!claimed || claimed.length === 0) return json({ status: "paid", applied: false, alreadyPaid: true });

  const table = order.target_type === "listing" ? "listings" : "franchises";
  const { error: promoteError } = await asAdmin
    .from(table)
    .update({ is_featured: true, featured_until: until.toISOString() })
    .eq("id", order.target_id);

  if (promoteError) {
    // Money taken, promotion not applied — must be loud and recoverable.
    console.error("[verify-promotion-payment] PAID BUT NOT PROMOTED", order.id, promoteError);
    await asAdmin
      .from("promotion_orders")
      .update({ failure_reason: "paid_but_promote_failed" })
      .eq("id", order.id);
    return json({ error: "تم الدفع لكن تعذّر تفعيل التمييز. تواصل معنا." }, 500);
  }

  await asAdmin.from("notifications").insert({
    user_id: order.user_id,
    type: "promotion_activated",
    title: "تم تفعيل التمييز",
    body: `إعلانك الآن في أعلى نتائج التصفح حتى ${until.toLocaleDateString("ar-SA")}.`,
    related_id: order.target_id,
  });

  return json({ status: "paid", applied: true, featuredUntil: until.toISOString() });
}

export async function paylinkAuth(base: string, apiId: string, secretKey: string): Promise<string | null> {
  const res = await fetch(`${base}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ apiId, secretKey, persistToken: false }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    console.error("[paylink] auth failed", res.status, data);
    return null;
  }
  return data.id_token ?? data.token ?? data.access_token ?? null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
