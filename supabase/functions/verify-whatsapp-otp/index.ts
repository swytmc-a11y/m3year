// Miyar (معيار) — verifies a WhatsApp OTP (via Authentica) and bridges the
// result into a real Supabase session.
//
// Accounts created BY this bridge are mapped to a synthetic, namespaced email
// (`<digits>@phone.miyar.internal`) with a password derived as
// HMAC-SHA256(phone, AUTH_BRIDGE_PEPPER). AUTH_BRIDGE_PEPPER only ever lives
// in this function's environment — nobody, including us, can derive that
// password from the phone number alone.
//
// Accounts that already existed before this bridge (registered with a real
// email + password) can't be reached that way: their primary email is their
// own, not the synthetic one. For those, the phone is resolved to its owner
// through profile_contact and the session is issued from a single-use
// admin-generated magic-link token. profile_contact has no INSERT/UPDATE RLS
// policy for any client role — only the handle_new_user trigger writes it —
// so the phone→account mapping can't be tampered with from the outside.
//
// Two-step for brand-new numbers: first call without `fullName` returns
// { needsName: true } once Authentica confirms the OTP but no account exists
// yet. The client then re-submits the SAME otp with `fullName` included to
// actually create the account. Authentica OTPs are single-use, so the second
// call reuses a short-lived local cache (phone_verifications) of the first
// successful verification instead of re-sending the same otp to Authentica.

import { createClient } from "jsr:@supabase/supabase-js@2";

const AUTHENTICA_BASE = "https://api.authentica.sa";
const EMAIL_DOMAIN = "phone.miyar.internal";

// The WhatsApp OTP is 4 digits — only 10,000 combinations — and this endpoint
// is public (verify_jwt=false). Without our own attempt counter the whole
// keyspace can be walked for any number, which is an account-takeover path,
// so failed attempts are capped per phone regardless of what the upstream
// provider does.
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let phone: string | undefined;
  let otp: string | undefined;
  let fullName: string | undefined;
  try {
    const body = await req.json();
    phone = typeof body?.phone === "string" ? body.phone : undefined;
    otp = typeof body?.otp === "string" ? body.otp : undefined;
    fullName = typeof body?.fullName === "string" ? body.fullName.trim() : undefined;
  } catch {
    // fall through to validation below
  }
  if (!phone || !/^\+9665\d{8}$/.test(phone) || !otp || !/^\d{4}$/.test(otp)) {
    return json({ error: "بيانات غير صحيحة" }, 400);
  }
  if (fullName !== undefined && (fullName.length < 2 || fullName.length > 80)) {
    return json({ error: "أدخل اسمًا صحيحًا" }, 400);
  }

  const authenticaKey = Deno.env.get("AUTHENTICA_API_KEY");
  const pepper = Deno.env.get("AUTH_BRIDGE_PEPPER");
  if (!authenticaKey || !pepper) {
    console.error("[verify-whatsapp-otp] missing AUTHENTICA_API_KEY or AUTH_BRIDGE_PEPPER");
    return json({ error: "خدمة التحقق عبر واتساب غير مُهيَّأة بعد" }, 503);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Attempt budget is checked before anything else — including the local
  // cache — so a lockout can't be sidestepped by any code path below.
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

  // Authentica OTPs are single-use. The signup flow calls this function twice
  // for a brand-new number (once to check the account exists, once again
  // after the name step) with the SAME otp — re-sending it to Authentica the
  // second time gets rejected as already-consumed. Reuse a cached recent
  // verification instead of calling Authentica again when we already know
  // this exact phone+otp pair was verified moments ago.
  const CACHE_WINDOW_MS = 10 * 60 * 1000;
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
        // `method` must match the channel used in send-otp — Authentica
        // stores/validates the OTP per delivery channel, not just per phone.
        body: JSON.stringify({ method: "whatsapp", phone, otp }),
      });
      const rawBody = await res.text();

      if (!res.ok) {
        console.error("[verify-whatsapp-otp] Authentica non-2xx", res.status);
        await registerFailedAttempt();
        return json({ error: "تعذّر التحقق من الرمز الآن. حاول مرة أخرى." }, 502);
      }
      // Confirmed from a captured live response: Authentica returns
      // {"status":true,"message":"OTP verified successfully"} on success —
      // the field is `status`, not `verified`. Checking the wrong key meant a
      // genuinely successful verification was always read as a failure and
      // rejected with 401, regardless of the code entered.
      const result = rawBody ? JSON.parse(rawBody) : null;
      if (result?.status !== true) {
        await registerFailedAttempt();
        return json({ error: "الرمز غير صحيح أو منتهي الصلاحية." }, 401);
      }
    } catch (err) {
      console.error("[verify-whatsapp-otp] Authentica request failed", err);
      await registerFailedAttempt();
      return json({ error: "تعذّر التحقق من الرمز الآن. حاول مرة أخرى." }, 502);
    }

    await asAdmin
      .from("phone_verifications")
      .upsert({ phone, otp, verified_at: new Date().toISOString() });
  }

  // Possession of the number is proven from here on.
  await clearAttempts();

  const digits = phone.replace(/\D/g, "");
  const bridgeEmail = `${digits}@${EMAIL_DOMAIN}`;
  const bridgePassword = await derivePassword(phone, pepper);

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const asAnon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const { data: signInData, error: signInError } = await asAnon.auth.signInWithPassword({
    email: bridgeEmail,
    password: bridgePassword,
  });

  if (!signInError && signInData.session) {
    return json({ session: signInData.session });
  }

  // signInWithPassword only succeeds for accounts this bridge created itself.
  // A phone registered through the email/password flow has a real primary
  // email, so it fails here too — but that does NOT mean the phone is new.
  // Resolving it through profile_contact first is what keeps an existing user
  // from being pushed into a signup that would then collide with the
  // unique-phone constraint and fail outright.
  const { data: existingContact } = await asAdmin
    .from("profile_contact")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingContact?.id) {
    // Read the CURRENT email straight from auth.users rather than the copy in
    // profile_contact, which is only written at signup and would be stale if
    // the address ever changed. generateLink needs the address the account
    // actually authenticates with.
    const { data: userData, error: userError } = await asAdmin.auth.admin.getUserById(
      existingContact.id,
    );
    const accountEmail = userData?.user?.email;
    if (userError || !accountEmail) {
      console.error("[verify-whatsapp-otp] could not resolve existing account", userError);
      return json({ error: "تعذّر تسجيل الدخول الآن. حاول مرة أخرى." }, 500);
    }

    const { data: linkData, error: linkError } = await asAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: accountEmail,
    });
    const hashedToken = linkData?.properties?.hashed_token;
    if (linkError || !hashedToken) {
      console.error("[verify-whatsapp-otp] generateLink failed", linkError);
      return json({ error: "تعذّر تسجيل الدخول الآن. حاول مرة أخرى." }, 500);
    }

    // A hashed token must go through `token_hash` — passing it as `token`
    // makes GoTrue compare it against the plaintext email OTP instead, which
    // never matches.
    const { data: verifyData, error: verifyError } = await asAnon.auth.verifyOtp({
      type: "magiclink",
      token_hash: hashedToken,
    });
    if (verifyError || !verifyData.session) {
      console.error("[verify-whatsapp-otp] verifyOtp failed", verifyError);
      return json({ error: "تعذّر تسجيل الدخول الآن. حاول مرة أخرى." }, 500);
    }

    return json({ session: verifyData.session });
  }

  // Genuinely no account owns this phone yet.
  if (!fullName) {
    return json({ needsName: true });
  }

  const { data: signUpData, error: signUpError } = await asAnon.auth.signUp({
    email: bridgeEmail,
    password: bridgePassword,
    options: { data: { full_name: fullName, phone } },
  });

  if (signUpError || !signUpData.session) {
    console.error("[verify-whatsapp-otp] signUp failed", signUpError);
    return json({ error: "تعذّر إنشاء الحساب الآن. حاول مرة أخرى." }, 500);
  }

  return json({ session: signUpData.session });
});

async function derivePassword(phone: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(phone));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
