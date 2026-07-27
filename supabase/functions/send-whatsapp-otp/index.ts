// Miyar (معيار) — sends a WhatsApp OTP via Authentica for phone-first login.
//
// This is step 1 of the phone auth bridge: no session exists yet, so there is
// no caller JWT to act as. The only privileged thing this function does is
// read/update a small internal rate-limit table (phone_otp_throttle) that
// has zero RLS grants to anon/authenticated — same narrow, documented
// service_role exception already used in notify-new-message for push_tokens
// reads. Nothing else here uses service_role; the actual OTP delivery is
// just an outbound call to Authentica with our own API key.

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
  // The browser (and some fetch clients) send a CORS preflight OPTIONS
  // request before the real POST — without answering it, the actual request
  // never gets sent at all (surfaces client-side as a generic "failed to
  // send a request" error, not any error from this function's own logic).
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
      const detail = await res.text().catch(() => "");
      console.error("[send-whatsapp-otp] Authentica returned", res.status, detail);
      return json({ error: "تعذّر إرسال رمز التحقق الآن. حاول مرة أخرى." }, 502);
    }

    return json({ sent: true });
  } catch (err) {
    console.error("[send-whatsapp-otp] Authentica request failed", err);
    return json({ error: "تعذّر إرسال رمز التحقق الآن. حاول مرة أخرى." }, 502);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
