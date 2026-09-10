// Attaches a verified phone number to an ALREADY signed-in account.
//
// This exists because a customer who signed up by email has no phone on
// their profile at all — and after the fix in verify-whatsapp-otp/
// handle_new_user(), that is now true even if they typed one into the old
// signup form, since that value was never actually proven. Wallet credit
// checks profiles.phone before granting the welcome bonus specifically
// because it is meant to require a real, possessed number; this is the one
// place a customer can earn that column honestly without going through the
// separate phone-login flow (which would try to log them into a DIFFERENT
// session rather than upgrading the one they already have).
//
// Unlike verify-whatsapp-otp, this function requires an existing session —
// it upgrades an account, never creates or logs into one. If the number
// already belongs to someone else, this fails rather than merging accounts
// or moving the number.

import { createClient } from "jsr:@supabase/supabase-js@2";

const AUTHENTICA_BASE = "https://api.authentica.sa";

// Same budget as verify-whatsapp-otp, and for the same reason: a 4-digit
// WhatsApp OTP is only 10,000 combinations, and this table is shared with
// that flow so an attacker cannot get a fresh budget by switching endpoints.
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const CACHE_WINDOW_MS = 10 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[verify-account-phone] unhandled error", err);
    return json({ error: "تعذّر إتمام العملية الآن. حاول مرة أخرى." }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let phone: string | undefined;
  let otp: string | undefined;
  try {
    const body = await req.json();
    phone = typeof body?.phone === "string" ? body.phone : undefined;
    otp = typeof body?.otp === "string" ? body.otp : undefined;
  } catch {
    // fall through to validation below
  }
  if (!phone || !/^\+9665\d{8}$/.test(phone) || !otp || !/^\d{4}$/.test(otp)) {
    return json({ error: "بيانات غير صحيحة" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // Who is asking. Resolved through their own JWT rather than a userId in
  // the body, so nothing here can be pointed at someone else's account.
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "انتهت الجلسة. سجّل الدخول مرة أخرى." }, 401);
  }
  const userId = userData.user.id;

  const authenticaKey = Deno.env.get("AUTHENTICA_API_KEY");
  if (!authenticaKey) {
    console.error("[verify-account-phone] missing AUTHENTICA_API_KEY");
    return json({ error: "خدمة التحقق عبر واتساب غير مُهيَّأة بعد" }, 503);
  }

  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Someone already owns this number — including the caller themselves,
  // which just means their phone is already verified and there is nothing
  // to do.
  const { data: owner } = await asAdmin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (owner && owner.id !== userId) {
    return json({ error: "هذا الرقم مسجَّل لحساب آخر." }, 409);
  }
  if (owner && owner.id === userId) {
    return json({ success: true, alreadyVerified: true });
  }

  const { data: throttle } = await asAdmin
    .from("phone_otp_throttle")
    .select("verify_count, verify_window_start")
    .eq("phone", phone)
    .maybeSingle();

  const verifyWindowOpen =
    throttle?.verify_window_start != null &&
    Date.now() - new Date(throttle.verify_window_start).getTime() < VERIFY_WINDOW_MS;
  const attemptsUsed = verifyWindowOpen ? (throttle?.verify_count ?? 0) : 0;

  if (attemptsUsed >= MAX_VERIFY_ATTEMPTS) {
    return json(
      { error: "تجاوزت عدد المحاولات المسموح بها. اطلب رمزًا جديدًا بعد قليل." },
      429,
    );
  }

  const registerFailedAttempt = async () => {
    await asAdmin.from("phone_otp_throttle").upsert({
      phone,
      verify_count: attemptsUsed + 1,
      verify_window_start: verifyWindowOpen
        ? throttle!.verify_window_start
        : new Date().toISOString(),
    });
  };
  const clearAttempts = async () => {
    await asAdmin
      .from("phone_otp_throttle")
      .update({ verify_count: 0, verify_window_start: null })
      .eq("phone", phone);
  };

  const { data: cached } = await asAdmin
    .from("phone_verifications")
    .select("otp, verified_at")
    .eq("phone", phone)
    .maybeSingle();
  const isCachedHit =
    cached &&
    cached.otp === otp &&
    Date.now() - new Date(cached.verified_at).getTime() < CACHE_WINDOW_MS;

  if (!isCachedHit) {
    try {
      const res = await fetch(`${AUTHENTICA_BASE}/api/v2/verify-otp`, {
        method: "POST",
        headers: {
          "X-Authorization": authenticaKey,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ method: "whatsapp", phone, otp }),
      });
      const rawBody = await res.text();

      if (!res.ok) {
        console.error("[verify-account-phone] Authentica non-2xx", res.status, rawBody);
        await registerFailedAttempt();
        return json({ error: "تعذّر التحقق من الرمز الآن. حاول مرة أخرى." }, 502);
      }
      // Authentica's success field is `status`, not `verified`.
      const result = rawBody ? JSON.parse(rawBody) : null;
      if (result?.status !== true) {
        await registerFailedAttempt();
        return json({ error: "الرمز غير صحيح أو منتهي الصلاحية." }, 401);
      }
    } catch (err) {
      console.error("[verify-account-phone] Authentica request failed", err);
      await registerFailedAttempt();
      return json({ error: "تعذّر التحقق من الرمز الآن. حاول مرة أخرى." }, 502);
    }

    await asAdmin
      .from("phone_verifications")
      .upsert({ phone, otp, verified_at: new Date().toISOString() });
  }

  await clearAttempts();

  // Written with the service role: guard_profile_privileges() freezes
  // profiles.phone against the customer's own writes (auth.uid() would be
  // this same user under their own client), and correctly so everywhere
  // except this one server-side path that just finished proving possession.
  // The unique index on profiles.phone still catches a race against another
  // request claiming the same number between the ownership check above and
  // this write.
  const { error: updateError } = await asAdmin
    .from("profiles")
    .update({ phone })
    .eq("id", userId);

  if (updateError) {
    console.error("[verify-account-phone] profile update failed", updateError);
    const message = updateError.message?.includes("profiles_phone_key")
      ? "هذا الرقم مسجَّل لحساب آخر."
      : "تعذّر حفظ رقم الجوال الآن. حاول مرة أخرى.";
    return json({ error: message }, 500);
  }

  return json({ success: true });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
