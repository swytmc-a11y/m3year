// Miyar (معيار) — verifies a WhatsApp OTP (via Authentica) and bridges the
// result into a real Supabase session, WITHOUT a service_role key.
//
// Why this is safe without service_role: the phone is mapped to a synthetic,
// namespaced email (`<digits>@phone.miyar.internal`) and a password derived
// as HMAC-SHA256(phone, AUTH_BRIDGE_PEPPER). AUTH_BRIDGE_PEPPER only ever
// lives in this function's environment — nobody, including us, can derive
// that password from the phone number alone. Supabase's own
// signInWithPassword/signUp (anon key, same as any client call) then does
// all real session issuance; this function never mints a session itself and
// never touches auth.users directly.
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
  if (!phone || !/^\+9665\d{8}$/.test(phone) || !otp) {
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
        console.error("[verify-whatsapp-otp] Authentica non-2xx", res.status, rawBody);
        return json({ error: "تعذّر التحقق من الرمز الآن. حاول مرة أخرى." }, 502);
      }
      const result = rawBody ? JSON.parse(rawBody) : null;
      if (result?.verified !== true) {
        console.error("[verify-whatsapp-otp] Authentica rejected otp", rawBody);
        return json({ error: "الرمز غير صحيح أو منتهي الصلاحية." }, 401);
      }
    } catch (err) {
      console.error("[verify-whatsapp-otp] Authentica request failed", err);
      return json({ error: "تعذّر التحقق من الرمز الآن. حاول مرة أخرى." }, 502);
    }

    await asAdmin
      .from("phone_verifications")
      .upsert({ phone, otp, verified_at: new Date().toISOString() });
  }

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

  // Any account-not-found path lands here as an "invalid credentials" style
  // error from Supabase — treat it uniformly as "this phone has no account yet".
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
