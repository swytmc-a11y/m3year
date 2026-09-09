// Sends a WhatsApp OTP via Authentica for phone-first login.
//
// Step 1 of the phone auth bridge: no session exists yet, so there is no
// caller JWT to act as. The only privileged thing this function does is
// read/update phone_otp_throttle, a table with RLS on and no policies at all
// — anon and authenticated get nothing, only the service role reaches it.
// Everything else here is an outbound call to Authentica with our own key.
//
// Because this endpoint is public by necessity, the throttle IS the
// protection: a cooldown between sends so one number cannot be spammed, and
// an hourly cap so our Authentica credit cannot be drained by a script.

import { createClient } from "jsr:@supabase/supabase-js@2";

const AUTHENTICA_BASE = "https://api.authentica.sa";
const COOLDOWN_SECONDS = 60;
const MAX_PER_HOUR = 5;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // An escaping throw becomes a platform 500 with no CORS headers, which the
  // browser surfaces as "Failed to send a request to the Edge Function" —
  // hiding the real error behind what looks like a network failure.
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[send-whatsapp-otp] unhandled error", err);
    return json({ error: "تعذّر إرسال رمز التحقق الآن. حاول مرة أخرى." }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  // The browser sends a CORS preflight before the real POST — without
  // answering it the actual request is never sent, which surfaces
  // client-side as a generic network failure rather than anything from here.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let phone: string | undefined;
  try {
    const body = await req.json();
    phone = typeof body?.phone === "string" ? body.phone : undefined;
  } catch {
    // fall through to validation below
  }
  if (!phone || !/^\+9665\d{8}$/.test(phone)) {
    return json({ error: "أدخل رقم جوال سعودي صحيح بصيغة +9665xxxxxxxx" }, 400);
  }

  const authenticaKey = Deno.env.get("AUTHENTICA_API_KEY");
  if (!authenticaKey) {
    console.error("[send-whatsapp-otp] AUTHENTICA_API_KEY is not configured");
    return json({ error: "خدمة التحقق عبر واتساب غير مُهيَّأة بعد" }, 503);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const asAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const { data: throttle } = await asAdmin
    .from("phone_otp_throttle")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (throttle) {
    const lastSent = throttle.last_sent_at ? new Date(throttle.last_sent_at) : null;
    if (lastSent && now.getTime() - lastSent.getTime() < COOLDOWN_SECONDS * 1000) {
      return json({ error: "انتظر قليلًا قبل طلب رمز جديد." }, 429);
    }

    const windowStart = new Date(throttle.window_start);
    const withinWindow = now.getTime() - windowStart.getTime() < 60 * 60 * 1000;
    const nextCount = withinWindow ? throttle.send_count + 1 : 1;

    if (withinWindow && nextCount > MAX_PER_HOUR) {
      return json({ error: "تجاوزت الحد الأقصى لمحاولات الإرسال. حاول لاحقًا." }, 429);
    }

    await asAdmin
      .from("phone_otp_throttle")
      .update({
        last_sent_at: now.toISOString(),
        send_count: nextCount,
        window_start: withinWindow ? throttle.window_start : now.toISOString(),
      })
      .eq("phone", phone);
  } else {
    await asAdmin.from("phone_otp_throttle").insert({
      phone,
      last_sent_at: now.toISOString(),
      send_count: 1,
      window_start: now.toISOString(),
    });
  }

  try {
    const res = await fetch(`${AUTHENTICA_BASE}/api/v2/send-otp`, {
      method: "POST",
      headers: {
        "X-Authorization": authenticaKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ method: "whatsapp", phone }),
    });

    if (!res.ok) {
      const rawBody = await res.text().catch(() => "");
      // The status is worth keeping: 401 here means our own key is bad or
      // expired, which reads identically to "the code didn't arrive" from the
      // app and is otherwise only findable by guessing.
      console.error("[send-whatsapp-otp] Authentica returned", res.status, rawBody);
      return json({ error: "تعذّر إرسال رمز التحقق الآن. حاول مرة أخرى." }, 502);
    }

    return json({ sent: true });
  } catch (err) {
    console.error("[send-whatsapp-otp] Authentica request failed", err);
    return json({ error: "تعذّر إرسال رمز التحقق الآن. حاول مرة أخرى." }, 502);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
