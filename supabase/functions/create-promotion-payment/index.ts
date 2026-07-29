// Miyar (معيار) — starts a paid promotion ("تمييز") for a listing or franchise.
//
// Publishing is free. This buys one thing: a time-boxed slot at the top of
// the feed. Same price for a listing and a franchise.
//
// What this function will NOT trust from the caller:
//   - the price. The client sends a plan *code*; the amount is read from
//     public.promotion_plans. A tampered client can ask for plan
//     'featured_30' but cannot claim it costs 1 halala.
//   - ownership. The target row is read through `asUser` (anon key + the
//     caller's own JWT), so RLS decides whether they can see it at all. A
//     listing belonging to someone else simply is not found.
//
// The order row is written with the service role because promotion_orders
// has no INSERT policy for authenticated users on purpose — if it did,
// anyone could insert a row with status='paid' and promote themselves free.
//
// Card data never touches this code or the app: the provider hosts the
// payment page and we only ever hold the invoice id and its URL, which keeps
// the whole product out of PCI scope.
//
// Provider selection is by configuration: Paylink if its keys are present,
// otherwise Moyasar. Either way the promotion is applied only after the
// payment is confirmed against that provider's own API — never from this
// function, and never by trusting the client.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MOYASAR_API = "https://api.moyasar.com/v1/invoices";

type TargetType = "listing" | "franchise";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[create-promotion-payment] unhandled error", err);
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

  let body: { targetType?: string; targetId?: string; planCode?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid request body" }, 400);
  }

  const targetType = body.targetType === "listing" || body.targetType === "franchise"
    ? (body.targetType as TargetType)
    : null;
  const targetId = typeof body.targetId === "string" ? body.targetId : null;
  const planCode = typeof body.planCode === "string" ? body.planCode : null;

  if (!targetType || !targetId || !planCode) {
    return json({ error: "targetType, targetId and planCode are required" }, 400);
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
  const userId = userData.user.id;

  // Ownership + eligibility, enforced by RLS rather than by a claim in the
  // request. Only a published item can be promoted — paying to feature a
  // draft nobody can see would be taking money for nothing.
  const table = targetType === "listing" ? "listings" : "franchises";
  const { data: target, error: targetError } = await asUser
    .from(table)
    .select("id, owner_id, status, is_featured, featured_until")
    .eq("id", targetId)
    .maybeSingle();

  if (targetError) {
    console.error("[create-promotion-payment] target lookup failed", targetError);
    return json({ error: "تعذّر التحقق من الإعلان." }, 500);
  }
  if (!target || target.owner_id !== userId) {
    return json({ error: "لم يتم العثور على الإعلان." }, 404);
  }
  if (target.status !== "published") {
    return json({ error: "يمكن تمييز الإعلانات المنشورة فقط." }, 400);
  }
  if (target.featured_until && new Date(target.featured_until) > new Date()) {
    return json({ error: "هذا الإعلان مميّز بالفعل حتى انتهاء المدة الحالية." }, 409);
  }

  // Price comes from the database, never the request.
  const { data: plan, error: planError } = await asUser
    .from("promotion_plans")
    .select("code, name_ar, duration_days, price_halalas, is_active")
    .eq("code", planCode)
    .maybeSingle();

  if (planError) {
    console.error("[create-promotion-payment] plan lookup failed", planError);
    return json({ error: "تعذّر قراءة باقات التمييز." }, 500);
  }
  if (!plan || !plan.is_active) {
    return json({ error: "باقة التمييز غير متاحة." }, 400);
  }

  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const paylinkApiId = Deno.env.get("PAYLINK_API_ID");
  const paylinkSecret = Deno.env.get("PAYLINK_SECRET_KEY");

  const { data: order, error: orderError } = await asAdmin
    .from("promotion_orders")
    .insert({
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      plan_code: plan.code,
      amount_halalas: plan.price_halalas,
      currency: "SAR",
      status: "pending",
      provider: paylinkApiId ? "paylink" : "moyasar",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("[create-promotion-payment] order insert failed", orderError);
    return json({ error: "تعذّر إنشاء طلب الدفع." }, 500);
  }

  if (paylinkApiId && paylinkSecret) {
    const base = Deno.env.get("PAYLINK_BASE_URL") ?? "https://restapi.paylink.sa";

    // fetch() from inside this runtime hangs indefinitely against Paylink's
    // host (confirmed live), so the actual HTTP call is made through pg_net
    // from Postgres instead — same request, a network path that works.
    const authCall = await paylinkNetCall(asAdmin, "POST", `${base}/api/auth`, {
      "Content-Type": "application/json",
      Accept: "application/json",
    }, { apiId: paylinkApiId, secretKey: paylinkSecret, persistToken: false });

    if (authCall.error) {
      console.error("[create-promotion-payment] paylink auth call failed", authCall.error);
      await failOrder(asAdmin, order.id, `paylink_auth_error`);
      return json({ error: "تعذّر الاتصال ببوابة الدفع." }, 502);
    }
    const auth = authCall.body;
    const token = auth?.id_token ?? auth?.token ?? auth?.access_token ?? null;

    if (authCall.status !== 200 || !token) {
      console.error("[create-promotion-payment] paylink auth failed", authCall.status, JSON.stringify(auth));
      await failOrder(asAdmin, order.id, `paylink_auth_${authCall.status}`);
      return json({ error: "تعذّر الاتصال ببوابة الدفع." }, 502);
    }

    // Paylink bills in riyals, not the smallest unit.
    const amountSar = plan.price_halalas / 100;

    const invoiceCall = await paylinkNetCall(asAdmin, "POST", `${base}/api/addInvoice`, {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    }, {
      // Our own order id, so the invoice can always be traced back.
      orderNumber: order.id,
      amount: amountSar,
      // Where Paylink returns the customer's browser. It is only a
      // redirect — the promotion is applied by verify-promotion-payment
      // after asking Paylink directly, never by trusting this landing.
      callBackUrl: "https://miyear.site/promotion/return",
      cancelUrl: "https://miyear.site/promotion/cancelled",
      clientName: userData.user.user_metadata?.full_name ?? "عميل معيار",
      clientEmail: userData.user.email ?? undefined,
      clientMobile: userData.user.phone ?? undefined,
      currency: "SAR",
      products: [
        { title: plan.name_ar, price: amountSar, qty: 1, isDigital: true },
      ],
    });

    if (invoiceCall.error) {
      console.error("[create-promotion-payment] paylink addInvoice call failed", invoiceCall.error);
      await failOrder(asAdmin, order.id, "paylink_invoice_error");
      return json({ error: "تعذّر إنشاء فاتورة الدفع. حاول مرة أخرى." }, 502);
    }
    const invoice = invoiceCall.body;

    if (invoiceCall.status !== 200 || !invoice) {
      console.error("[create-promotion-payment] paylink addInvoice failed", invoiceCall.status, JSON.stringify(invoice));
      await failOrder(asAdmin, order.id, `paylink_invoice_${invoiceCall.status}`);
      return json({ error: "تعذّر إنشاء فاتورة الدفع. حاول مرة أخرى." }, 502);
    }

    const paymentUrl: string | null = invoice.url ?? invoice.mobileUrl ?? invoice.paymentUrl ?? null;
    const transactionNo: string | null = invoice.transactionNo ?? null;

    if (!paymentUrl || !transactionNo) {
      // Logged in full so the exact field names can be pinned from the first
      // real run rather than guessed at.
      console.error("[create-promotion-payment] unexpected paylink invoice shape", JSON.stringify(invoice));
      await failOrder(asAdmin, order.id, "paylink_no_url");
      return json({ error: "تعذّر فتح صفحة الدفع. حاول مرة أخرى." }, 502);
    }

    await asAdmin
      .from("promotion_orders")
      .update({ provider_invoice_id: transactionNo })
      .eq("id", order.id);

    return json({ orderId: order.id, paymentUrl });
  }

  const moyasarKey = Deno.env.get("MOYASAR_SECRET_KEY");
  if (!moyasarKey) {
    // Stays dormant until a provider key is configured.
    console.warn("[create-promotion-payment] no payment provider configured");
    await failOrder(asAdmin, order.id, "provider_not_configured");
    return json({ error: "خدمة الدفع غير مفعّلة حاليًا." }, 503);
  }

  // metadata comes back to us on the webhook, and is how a confirmed payment
  // is tied to the order it belongs to without trusting anything the client
  // sends at that point.
  const callbackUrl = `${supabaseUrl}/functions/v1/moyasar-webhook`;
  const invoicePayload = {
    amount: plan.price_halalas,
    currency: "SAR",
    description: `${plan.name_ar} — معيار`,
    callback_url: callbackUrl,
    success_url: "https://miyear.site/promotion/success",
    back_url: "https://miyear.site/promotion/cancelled",
    metadata: {
      order_id: order.id,
      target_type: targetType,
      target_id: targetId,
      plan_code: plan.code,
    },
  };

  const moyasarRes = await fetch(MOYASAR_API, {
    method: "POST",
    headers: {
      // Moyasar uses HTTP Basic with the secret key as the username and an
      // empty password.
      Authorization: `Basic ${btoa(`${moyasarKey}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(invoicePayload),
  });

  const invoice = await moyasarRes.json().catch(() => null);

  if (!moyasarRes.ok || !invoice) {
    console.error("[create-promotion-payment] moyasar rejected invoice", moyasarRes.status, JSON.stringify(invoice));
    await failOrder(asAdmin, order.id, `moyasar_${moyasarRes.status}`);
    return json({ error: "تعذّر إنشاء فاتورة الدفع. حاول مرة أخرى." }, 502);
  }

  const paymentUrl: string | null =
    invoice.url ?? invoice.invoice_url ?? invoice?.source?.transaction_url ?? null;

  if (!paymentUrl) {
    console.error("[create-promotion-payment] no payment url in invoice", JSON.stringify(invoice));
    await failOrder(asAdmin, order.id, "no_payment_url");
    return json({ error: "تعذّر فتح صفحة الدفع. حاول مرة أخرى." }, 502);
  }

  await asAdmin
    .from("promotion_orders")
    .update({ provider_invoice_id: invoice.id ?? null })
    .eq("id", order.id);

  return json({ orderId: order.id, paymentUrl });
}

// Marks an order failed with a reason, so a stuck 'pending' row never hides
// why a checkout did not complete.
async function failOrder(
  asAdmin: ReturnType<typeof createClient>,
  orderId: string,
  reason: string,
): Promise<void> {
  await asAdmin
    .from("promotion_orders")
    .update({ status: "failed", failure_reason: reason })
    .eq("id", orderId);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// Routes an HTTP call to Paylink through pg_net (via service-role RPCs)
// instead of fetch(), since fetch() from this runtime hangs against
// Paylink's host — see migration 0044_paylink_via_pg_net. The wait for a
// response happens here, as repeated fast polls, rather than inside one SQL
// statement — Postgres's statement_timeout for service_role (8s) killed the
// single-statement version before Paylink replied — see 0045.
export async function paylinkNetCall(
  asAdmin: ReturnType<typeof createClient>,
  method: "POST" | "GET",
  url: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<{ status?: number; body?: any; error?: string }> {
  const { data: requestId, error: startError } = await asAdmin.rpc("pg_net_start_request", {
    p_method: method,
    p_url: url,
    p_headers: headers,
    p_body: body ?? null,
  });
  if (startError || !requestId) return { error: startError?.message ?? "no_request_id" };

  const deadline = Date.now() + 18000;
  while (Date.now() < deadline) {
    const { data: result, error: pollError } = await asAdmin.rpc("pg_net_poll_request", {
      p_request_id: requestId,
    });
    if (pollError) return { error: pollError.message };
    if (result) {
      if (result.error) return { error: result.error };
      let parsed: any = null;
      try {
        parsed = result.body ? JSON.parse(result.body) : null;
      } catch {
        // not JSON — leave null, caller treats a missing token/field as failure
      }
      return { status: result.status, body: parsed };
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return { error: "poll_timeout" };
}
