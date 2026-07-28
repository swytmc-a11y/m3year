// Miyar (معيار) — simulated payment page.
//
// Lets the whole promotion flow be exercised before any real payment provider
// is activated: the app opens this page exactly as it would open a provider's
// hosted checkout, and the two buttons stand in for a successful and a failed
// payment.
//
// Why this cannot become a hole in production:
//   - It refuses any order whose plan is not marked is_test in the database.
//     Real priced plans are unreachable from here, so nothing can be promoted
//     by simulation. Deleting the test plan disables this function entirely.
//   - It only advances an order that is still 'pending', and only ever for
//     the duration that plan actually specifies.
//   - The order id is a server-generated UUID known only to whoever started
//     the checkout.
//
// verify_jwt is disabled because this is opened in a browser, not called by
// the app with a token — the checks above are what protect it.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[mock-payment] unhandled error", err);
    return html(page("خطأ", "حدث خطأ غير متوقع.", null), 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order");
  if (!orderId) return html(page("رابط غير صالح", "لا يوجد رقم طلب.", null), 400);

  const asAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: order } = await asAdmin
    .from("promotion_orders")
    .select("id, user_id, target_type, target_id, plan_code, amount_halalas, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return html(page("طلب غير موجود", "لم يتم العثور على هذا الطلب.", null), 404);

  const { data: plan } = await asAdmin
    .from("promotion_plans")
    .select("code, name_ar, duration_days, is_test")
    .eq("code", order.plan_code)
    .maybeSingle();

  // The gate. A real plan can never be settled here.
  if (!plan?.is_test) {
    console.warn("[mock-payment] refused non-test plan", order.plan_code);
    return html(
      page("غير متاح", "هذه الصفحة للباقات التجريبية فقط.", null),
      403,
    );
  }

  if (req.method === "GET") {
    if (order.status !== "pending") {
      return html(page("تم من قبل", `حالة هذا الطلب: ${order.status}`, null), 200);
    }
    return html(
      checkoutPage(order.id, plan.name_ar, order.amount_halalas, plan.duration_days),
    );
  }

  if (req.method !== "POST") {
    return html(page("غير مسموح", "طريقة طلب غير مدعومة.", null), 405);
  }

  // The browser form posts url-encoded; automated checks post JSON. Accept
  // both so the simulator can be exercised without a browser.
  const contentType = req.headers.get("Content-Type") ?? "";
  let outcome = "";
  if (contentType.includes("application/json")) {
    const parsed = await req.json().catch(() => null);
    outcome = String(parsed?.outcome ?? "");
  } else {
    const form = await req.formData();
    outcome = String(form.get("outcome") ?? "");
  }

  if (outcome === "fail") {
    await asAdmin
      .from("promotion_orders")
      .update({ status: "failed", failure_reason: "simulated_failure" })
      .eq("id", order.id)
      .eq("status", "pending");
    return html(
      page("فشل الدفع (محاكاة)", "لم يتم تفعيل التمييز — وهذا هو السلوك الصحيح.", "fail"),
    );
  }

  const from = new Date();
  const until = new Date(from.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

  // Conditional on still being pending, so a refresh or a double submit
  // cannot extend the promotion twice.
  const { data: claimed } = await asAdmin
    .from("promotion_orders")
    .update({
      status: "paid",
      provider_payment_id: `sim_${crypto.randomUUID()}`,
      paid_at: from.toISOString(),
      featured_from: from.toISOString(),
      featured_until: until.toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id");

  if (!claimed || claimed.length === 0) {
    return html(page("تم من قبل", "هذا الطلب عولج مسبقًا.", null));
  }

  const table = order.target_type === "listing" ? "listings" : "franchises";
  const { error: promoteError } = await asAdmin
    .from(table)
    .update({ is_featured: true, featured_until: until.toISOString() })
    .eq("id", order.target_id);

  if (promoteError) {
    console.error("[mock-payment] promote failed", promoteError);
    return html(page("خطأ", "تم الدفع لكن تعذّر تفعيل التمييز.", "fail"), 500);
  }

  await asAdmin.from("notifications").insert({
    user_id: order.user_id,
    type: "promotion_activated",
    title: "تم تفعيل التمييز (محاكاة)",
    body: `إعلانك الآن في أعلى نتائج التصفح حتى ${until.toLocaleDateString("ar-SA")}.`,
    related_id: order.target_id,
  });

  return html(
    page(
      "تم الدفع بنجاح (محاكاة)",
      "تم تفعيل التمييز. أغلق هذه الصفحة وارجع للتطبيق.",
      "ok",
    ),
  );
}

function checkoutPage(orderId: string, planName: string, halalas: number, days: number): string {
  const riyals = (halalas / 100).toFixed(2);
  return shell(`
    <div class="badge">بيئة محاكاة — لا يوجد دفع حقيقي</div>
    <h1>${escapeHtml(planName)}</h1>
    <div class="amount">${riyals} <span>ر.س</span></div>
    <p class="muted">مدة التمييز: ${days} ${days === 1 ? "يوم" : "أيام"}</p>
    <form method="POST">
      <button class="btn ok" name="outcome" value="success" type="submit">محاكاة دفع ناجح</button>
      <button class="btn fail" name="outcome" value="fail" type="submit">محاكاة دفع فاشل</button>
    </form>
    <p class="tiny">رقم الطلب: ${escapeHtml(orderId)}</p>
  `);
}

function page(title: string, body: string, tone: "ok" | "fail" | null): string {
  const icon = tone === "ok" ? "✓" : tone === "fail" ? "✕" : "•";
  const cls = tone === "ok" ? "ok" : tone === "fail" ? "fail" : "";
  return shell(`
    <div class="icon ${cls}">${icon}</div>
    <h1>${escapeHtml(title)}</h1>
    <p class="muted">${escapeHtml(body)}</p>
  `);
}

function shell(inner: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>معيار — محاكاة الدفع</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#F5F5F1;color:#171a1c;padding:24px;
    font-family:-apple-system,BlinkMacSystemFont,"SF Arabic","Segoe UI",Tahoma,sans-serif}
  .card{background:#fff;border-radius:20px;padding:32px 26px;max-width:380px;width:100%;
    text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.07)}
  .badge{display:inline-block;background:#fff4e5;color:#b26a1a;font-size:12px;
    padding:6px 12px;border-radius:999px;margin-bottom:18px}
  h1{font-size:19px;margin:0 0 14px}
  .amount{font-size:38px;font-weight:800;margin:6px 0 4px}
  .amount span{font-size:16px;font-weight:500;color:#6b7280}
  .muted{color:#6b7280;font-size:14px;line-height:1.7;margin:6px 0 0}
  .tiny{color:#9ca3af;font-size:11px;margin-top:20px;word-break:break-all}
  form{margin-top:26px;display:flex;flex-direction:column;gap:10px}
  .btn{border:0;border-radius:13px;padding:15px;font-size:15px;font-weight:700;
    cursor:pointer;font-family:inherit}
  .btn.ok{background:#0f6b66;color:#fff}
  .btn.fail{background:#fff;color:#b91c1c;border:1px solid #fecaca}
  .icon{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;
    justify-content:center;font-size:26px;margin:0 auto 16px;background:#e5e7eb;color:#374151}
  .icon.ok{background:#dcfce7;color:#15803d}
  .icon.fail{background:#fee2e2;color:#b91c1c}
</style></head>
<body><div class="card">${inner}</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
