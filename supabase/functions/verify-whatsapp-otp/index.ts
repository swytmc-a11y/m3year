// Miyar (معيار) — verifies a WhatsApp OTP (via Authentica) and bridges the
// result into a real Supabase session.
//
// The WhatsApp OTP only proves possession of the phone number — it is not an
// account by itself. Two outcomes follow:
//
// 1) The phone already belongs to an account (profile_contact lookup): log
//    that account straight in. Session issuance goes through a single-use
//    admin-generated magic-link token (token_hash + verifyOtp), never a
//    guessed/derived password — profile_contact has no INSERT/UPDATE RLS
//    policy for any client role, only the handle_new_user trigger writes it,
//    so the phone→account mapping can't be tampered with from the outside.
//
// 2) The phone is new: the client collects a real name + email + password (a
//    normal signup, not a synthetic bridge account) and resubmits with those
//    fields. The phone goes into that account's metadata as an
//    already-verified contact method — no separate re-verification needed,
//    since Authentica already proved possession earlier in this same request
//    chain. Supabase's own confirmation email still goes out (real SMTP is
//    configured) and is still the genuine path to a confirmed email, but the
//    session is handed back immediately rather than making the user wait for
//    that click — repeating the whole flow after a restart would burn
//    another Authentica OTP send for a phone that's already proven. See the
//    comment at the bottom of the new-signup branch for how that's done
//    without falsely marking the email as confirmed.
//
// Two-step for brand-new numbers: first call without `fullName` returns
// { needsName: true } once Authentica confirms the OTP but no account exists
// yet. The client then re-submits the SAME otp with fullName/email/password
// to actually create the account. Authentica OTPs are single-use, so the
// second call reuses a short-lived local cache (phone_verifications) of the
// first successful verification instead of re-sending the same otp to
// Authentica.

import { createClient } from "jsr:@supabase/supabase-js@2";

const AUTHENTICA_BASE = "https://api.authentica.sa";

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
  // Any throw that escapes the handler becomes a platform-level 500 with no
  // CORS headers, which the browser reports as "Failed to send a request to
  // the Edge Function" — an opaque message that hides the real error and
  // looks to the user like the network died. Everything below is wrapped so a
  // failure always comes back as readable JSON with CORS attached.
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
  // after the name/email/password step) with the SAME otp — re-sending it to
  // Authentica the second time gets rejected as already-consumed. Reuse a
  // cached recent verification instead of calling Authentica again when we
  // already know this exact phone+otp pair was verified moments ago.
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

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const asAnon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

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
  if (!fullName || !email || !password) {
    return json({ needsName: true });
  }

  const { data: signUpData, error: signUpError } = await asAnon.auth.signUp({
    email,
    password,
    // The phone is trustworthy here — Authentica already proved possession
    // earlier in this same request chain — so handle_new_user can store it
    // directly, unlike the plain email-signup path where a submitted phone
    // is just unverified contact info.
    options: { data: { full_name: fullName, phone } },
  });

  if (signUpError || !signUpData.user) {
    console.error("[verify-whatsapp-otp] signUp failed", signUpError);
    const message = signUpError?.message.includes("already registered")
      ? "هذا البريد الإلكتروني مسجّل مسبقًا."
      : "تعذّر إنشاء الحساب الآن. حاول مرة أخرى.";
    return json({ error: message }, 500);
  }

  // signUp() above already queued the real confirmation email through
  // Supabase's own SMTP — that part is untouched and still the honest path
  // to a genuinely confirmed email. But making the user wait for that click
  // before they can even open the app means every retry burns another
  // Authentica OTP send for no reason, when phone possession was already
  // proven earlier in this exact request. So: mint a session immediately via
  // the same single-use admin-link mechanism used for returning users, then
  // immediately undo the side effect that verifying any email-based OTP has
  // — it marks the address confirmed, which would be a lie here since the
  // user never actually opened their inbox for THIS token. The session
  // already handed back is unaffected by resetting the stored flag
  // afterward; only the real click from the actual email will set it again,
  // honestly, later.
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
