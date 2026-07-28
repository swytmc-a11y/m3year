// Miyar (معيار) — receives Moyasar payment notifications and applies the
// promotion that was paid for.
//
// This is the only place in the system that can set is_featured, so it is
// written defensively:
//
//   1. verify_jwt MUST be disabled for this function (Moyasar is not a
//      Supabase user and sends no JWT). That means the URL is publicly
//      reachable, so the shared secret below is the actual authentication.
//      A request without the right secret is rejected before anything is read.
//
//   2. The webhook body is NOT trusted for the amount or the status. After
//      the secret checks out, the payment is re-fetched from Moyasar's API
//      using our secret key, and the promotion is applied only if Moyasar
//      itself reports it paid, for the amount the order actually says. A
//      forged body that guessed the secret still cannot promote anything.
//
//   3. Applying is idempotent. Webhooks retry, and a retry must not extend
//      someone's promotion a second time — the order is only advanced while
//      it is still 'pending', and the UPDATE is conditional on that.

import { createClient } from "jsr:@supabase/supabase-js@2";

const MOYASAR_PAYMENT_API = "https://api.moyasar.com/v1/payments";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[moyasar-webhook] unhandled error", err);
    // 500 tells Moyasar to retry, which is what we want for a transient fault.
    return json({ error: "internal error" }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("MOYASAR_WEBHOOK_SECRET");
  const moyasarKey = Deno.env.get("MOYASAR_SECRET_KEY");
  if (!expectedSecret || !moyasarKey) {
    console.warn("[moyasar-webhook] secrets not configured");
    return json({ error: "not configured" }, 503);
  }

  let body: {
    type?: string;
    secret_token?: string;
    data?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid body" }, 400);
  }

  // Authentication. Moyasar echoes back the secret configured on the webhook
  // in the dashboard; a header variant is accepted too in case the webhook is
  // configured that way instead.
  const presentedSecret = body.secret_token ?? req.headers.get("x-moyasar-secret") ?? "";
  if (!timingSafeEqual(presentedSecret, expectedSecret)) {
    console.warn("[moyasar-webhook] rejected: bad secret");
    return json({ error: "unauthorized" }, 401);
  }

  const payment = (body.data ?? {}) as {
    id?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
  const paymentId = typeof payment.id === "string" ? payment.id : null;
  const orderId = typeof payment.metadata?.order_id === "string"
    ? (payment.metadata.order_id as string)
    : null;

  if (!paymentId || !orderId) {
    // Nothing actionable, but it authenticated — don't ask for a retry.
    console.warn("[moyasar-webhook] missing payment id or order_id", body.type);
    return json({ ok: true, ignored: true });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: order, error: orderError } = await asAdmin
    .from("promotion_orders")
    .select("id, user_id, target_type, target_id, plan_code, amount_halalas, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("[moyasar-webhook] order lookup failed", orderError);
    return json({ error: "lookup failed" }, 500);
  }
  if (!order) {
    console.warn("[moyasar-webhook] unknown order", orderId);
    return json({ ok: true, ignored: true });
  }
  if (order.status !== "pending") {
    // Already handled. Retries land here, which is exactly the intent.
    return json({ ok: true, alreadyProcessed: true });
  }

  // Independent confirmation. Everything above came from the request body;
  // this comes from Moyasar over our own authenticated connection.
  const verifyRes = await fetch(`${MOYASAR_PAYMENT_API}/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${btoa(`${moyasarKey}:`)}` },
  });
  const verified = await verifyRes.json().catch(() => null);

  if (!verifyRes.ok || !verified) {
    console.error("[moyasar-webhook] verification fetch failed", verifyRes.status);
    return json({ error: "verification failed" }, 500);
  }

  const verifiedStatus = String(verified.status ?? "");
  const verifiedAmount = Number(verified.amount ?? 0);

  if (verifiedStatus !== "paid") {
    await asAdmin
      .from("promotion_orders")
      .update({
        status: verifiedStatus === "failed" ? "failed" : "cancelled",
        provider_payment_id: paymentId,
        failure_reason: `moyasar_status_${verifiedStatus}`,
      })
      .eq("id", order.id)
      .eq("status", "pending");
    return json({ ok: true, applied: false, status: verifiedStatus });
  }

  // Underpayment guard: a paid-but-wrong-amount payment must not buy a
  // promotion it did not cover.
  if (verifiedAmount !== order.amount_halalas) {
    console.error("[moyasar-webhook] amount mismatch", verifiedAmount, order.amount_halalas);
    await asAdmin
      .from("promotion_orders")
      .update({
        status: "failed",
        provider_payment_id: paymentId,
        failure_reason: `amount_mismatch_${verifiedAmount}`,
      })
      .eq("id", order.id)
      .eq("status", "pending");
    return json({ ok: true, applied: false, reason: "amount_mismatch" });
  }

  const { data: plan } = await asAdmin
    .from("promotion_plans")
    .select("duration_days")
    .eq("code", order.plan_code)
    .maybeSingle();

  const durationDays = plan?.duration_days ?? 7;
  const from = new Date();
  const until = new Date(from.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Claim the order first, conditional on it still being pending. If two
  // webhook deliveries race, exactly one of them updates a row here and the
  // other sees zero rows affected and stops — so the promotion is applied
  // once, not twice.
  const { data: claimed, error: claimError } = await asAdmin
    .from("promotion_orders")
    .update({
      status: "paid",
      provider_payment_id: paymentId,
      paid_at: from.toISOString(),
      featured_from: from.toISOString(),
      featured_until: until.toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id");

  if (claimError) {
    console.error("[moyasar-webhook] claim failed", claimError);
    return json({ error: "claim failed" }, 500);
  }
  if (!claimed || claimed.length === 0) {
    return json({ ok: true, alreadyProcessed: true });
  }

  const table = order.target_type === "listing" ? "listings" : "franchises";
  const { error: promoteError } = await asAdmin
    .from(table)
    .update({ is_featured: true, featured_until: until.toISOString() })
    .eq("id", order.target_id);

  if (promoteError) {
    // Money was taken but the promotion did not land — this must be loud and
    // recoverable, so the order is flagged rather than silently left "paid".
    console.error("[moyasar-webhook] PAID BUT NOT PROMOTED", order.id, promoteError);
    await asAdmin
      .from("promotion_orders")
      .update({ failure_reason: "paid_but_promote_failed" })
      .eq("id", order.id);
    return json({ error: "promote failed" }, 500);
  }

  await asAdmin.from("notifications").insert({
    user_id: order.user_id,
    type: "promotion_activated",
    title: "تم تفعيل التمييز",
    body: `إعلانك الآن في أعلى نتائج التصفح حتى ${until.toLocaleDateString("ar-SA")}.`,
    related_id: order.target_id,
  });

  return json({ ok: true, applied: true });
}

// Constant-time comparison so a wrong secret cannot be discovered by timing
// how long the rejection takes.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
