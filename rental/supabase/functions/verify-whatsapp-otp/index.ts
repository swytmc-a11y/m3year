// Verifies a WhatsApp OTP (via Authentica) and bridges the result into a real
// Supabase session.
//
// The OTP only proves possession of the phone number — it is not an account by
// itself. Two outcomes follow:
//
// 1) The phone already belongs to an account: log that account straight in.
//    The session is minted from a single-use admin-generated magic-link token,
//    never a derived password. The phone -> account mapping it trusts is
//    profiles.phone, which customers cannot write: guard_profile_privileges()
//    freezes that column for anyone who is not an operator, and a unique index
//    keeps one number pointing at one account. Without both of those this
//    lookup would be an account-takeover path, since anyone could claim a
//    number they do not own and receive its logins.
//
// 2) The phone is new: the app collects a real name + email + password (a
//    normal signup, not a synthetic account) and resubmits with those fields.
//    The proven phone rides along in signUp metadata, which handle_new_user
//    copies onto the profile.
//
// Two-step for brand-new numbers: the first call without `fullName` returns
// { needsName: true } once Authentica confirms the code but no account exists.
// The app then re-submits the SAME otp with the signup fields. Authentica OTPs
// are single-use, so the second call reads a short-lived local cache of the
// first success (phone_verifications) instead of replaying a consumed code.

import { createClient } from "jsr:@supabase/supabase-js@2";

const AUTHENTICA_BASE = "https://api.authentica.sa";

// The WhatsApp OTP is 4 digits — only 10,000 combinations — and this endpoint
// is public (verify_jwt = false). Without our own attempt counter the whole
// keyspace can be walked for any number, which is an account-takeover path, so
// failed attempts are capped per phone regardless of what Authentica does.
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[verify-whatsapp-otp] unhandled error", err);
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
  let fullName: string | undefined;
  let email: string | undefined;
  let password: string | undefined;
  try {
    const body = await req.json();
    phone = typeof body?.phone === "string" ? body.phone : undefined;
    otp = typeof body?.otp === "string" ? body.otp : undefined;
    fullName = typeof body?.fullName === "string" ? body.fullName.trim() : undefined;
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
    password = typeof body?.password === "string" ? body.password : undefined;
  } catch {
    // fall through to validation below
  }
  if (!phone || !/^\+9665\d{8}$/.test(phone) || !otp || !/^\d{4}$/.test(otp)) {
    return json({ error: "بيانات غير صحيحة" }, 400);
  }
  if (fullName !== undefined) {
    if (fullName.length < 2 || fullName.length > 80) {
      return json({ error: "أدخل اسمًا صحيحًا" }, 400);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "أدخل بريدًا إلكترونيًا صحيحًا" }, 400);
    }
    if (!password || password.length < 6) {
      return json({ error: "كلمة السر يجب أن تكون 6 أحرف على الأقل" }, 400);
    }
  }

  const authenticaKey = Deno.env.get("AUTHENTICA_API_KEY");
  if (!authenticaKey) {
    console.error("[verify-whatsapp-otp] missing AUTHENTICA_API_KEY");
    return json({ error: "خدمة التحقق عبر واتساب غير مُهيَّأة بعد" }, 503);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Attempt budget is checked before anything else — including the local
  // cache — so a lockout cannot be sidestepped by any path below.
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
        // stores and validates the OTP per delivery channel, not per phone.
        body: JSON.stringify({ method: "whatsapp", phone, otp }),
      });
      const rawBody = await res.text();

      if (!res.ok) {
        console.error("[verify-whatsapp-otp] Authentica non-2xx", res.status, rawBody);
        await registerFailedAttempt();
        return json({ error: "تعذّر التحقق من الرمز الآن. حاول مرة أخرى." }, 502);
      }
      // Authentica answers a success as {"status":true,"message":"OTP verified
      // successfully"} — the field is `status`, not `verified`. Reading the
      // wrong key made every genuinely correct code come back rejected, which
      // is the bug that made this flow look permanently broken before.
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

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const asAnon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const { data: existingProfile } = await asAdmin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingProfile?.id) {
    // Read the current email from auth.users rather than the copy on the
    // profile, which is written at signup and would be stale if the address
    // ever changed. generateLink needs the address the account actually
    // authenticates with.
    const { data: userData, error: userError } = await asAdmin.auth.admin.getUserById(
      existingProfile.id,
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
  if (!fullName || !email || !password) {
    return json({ needsName: true });
  }

  const { data: signUpData, error: signUpError } = await asAnon.auth.signUp({
    email,
    password,
    // The phone is trustworthy here — Authentica proved possession earlier in
    // this same request chain — so handle_new_user can store it directly.
    options: { data: { full_name: fullName, phone } },
  });

  if (signUpError || !signUpData.user) {
    console.error("[verify-whatsapp-otp] signUp failed", signUpError);
    const message = signUpError?.message.includes("already registered")
      ? "هذا البريد الإلكتروني مسجّل مسبقًا."
      : "تعذّر إنشاء الحساب الآن. حاول مرة أخرى.";
    return json({ error: message }, 500);
  }

  // signUp() already queued the real confirmation email. Making the customer
  // wait for that click before they can open the app would burn another
  // Authentica send on every retry, for a phone already proven moments ago —
  // so mint the session now via the same single-use admin link used for
  // returning customers, then undo the side effect that verifying any
  // email-based token has: it marks the address confirmed, which would be a
  // lie here since nobody opened the inbox. The session already handed back is
  // unaffected by resetting the flag; only the real click sets it honestly.
  const { data: linkData, error: linkError } = await asAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    console.error("[verify-whatsapp-otp] generateLink failed for new signup", linkError);
    return json({ error: "تعذّر تسجيل الدخول الآن. حاول مرة أخرى." }, 500);
  }

  const { data: verifyData, error: verifyError } = await asAnon.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashedToken,
  });
  if (verifyError || !verifyData.session) {
    console.error("[verify-whatsapp-otp] verifyOtp failed for new signup", verifyError);
    return json({ error: "تعذّر تسجيل الدخول الآن. حاول مرة أخرى." }, 500);
  }

  await asAdmin.auth.admin.updateUserById(signUpData.user.id, { email_confirm: false });

  return json({ session: verifyData.session });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
