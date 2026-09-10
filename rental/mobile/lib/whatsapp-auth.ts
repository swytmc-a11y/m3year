import { supabase } from "@/lib/supabase";

type SendResult = { error?: string };
type VerifyResult = {
  needsName?: boolean;
  error?: string;
};

export async function sendWhatsAppOtp(phone: string): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-whatsapp-otp", {
    body: { phone },
  });
  if (error) {
    console.error("[whatsapp-auth] send failed", error);
    return { error: (await extractServerMessage(error)) ?? "تعذّر إرسال رمز التحقق الآن." };
  }
  if (data?.error) return { error: data.error };
  return {};
}

/**
 * Verifies the OTP. If the phone has no account yet and `fullName`/`email`/
 * `password` weren't provided, returns { needsName: true } — call again with
 * those set to actually create the account (the OTP is re-checked against
 * Authentica every time, so a stale code can't be replayed to create an
 * account). Either way, a successful result signs the caller straight in —
 * a brand-new account still gets a real confirmation email in the
 * background, but proving phone possession is enough to use the app right
 * away rather than waiting on that click.
 * The session is already set on the shared `supabase` client on success.
 */
export async function verifyWhatsAppOtp(
  phone: string,
  otp: string,
  signup?: { fullName: string; email: string; password: string },
): Promise<VerifyResult> {
  const { data, error } = await supabase.functions.invoke("verify-whatsapp-otp", {
    body: signup ? { phone, otp, ...signup } : { phone, otp },
  });
  if (error) {
    console.error("[whatsapp-auth] verify failed", error);
    return { error: (await extractServerMessage(error)) ?? "تعذّر التحقق من الرمز الآن." };
  }
  if (data?.error) return { error: data.error };
  if (data?.needsName) return { needsName: true };
  if (data?.session) {
    const { error: setError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (setError) {
      console.error("[whatsapp-auth] setSession failed", setError);
      return { error: "تعذّر إتمام تسجيل الدخول الآن." };
    }
    return {};
  }
  return { error: "استجابة غير متوقعة من خادم التحقق." };
}

/**
 * Attaches a verified phone to the ALREADY signed-in account — upgrading it,
 * never logging into or creating a different one. This is what an
 * email-registered customer uses to earn the wallet's welcome credit, which
 * checks profiles.phone before granting anything.
 *
 * Distinct from verifyWhatsAppOtp: that one establishes a session from an
 * OTP with no caller identity yet; this one requires an existing session
 * (the edge function reads it from the Authorization header, attached
 * automatically by supabase.functions.invoke for a signed-in client).
 */
export async function verifyAccountPhone(
  phone: string,
  otp: string,
): Promise<{ error?: string; alreadyVerified?: boolean }> {
  const { data, error } = await supabase.functions.invoke("verify-account-phone", {
    body: { phone, otp },
  });
  if (error) {
    console.error("[whatsapp-auth] account phone verify failed", error);
    return { error: (await extractServerMessage(error)) ?? "تعذّر التحقق من الرمز الآن." };
  }
  if (data?.error) return { error: data.error };
  return { alreadyVerified: Boolean(data?.alreadyVerified) };
}

// supabase-js's FunctionsHttpError.message is a generic, unhelpful string
// ("Edge Function returned a non-2xx status code") — it does NOT surface the
// JSON body our functions actually return (e.g. rate-limit or invalid-code
// messages). The real body is on error.context, a Response object.
async function extractServerMessage(error: unknown): Promise<string | undefined> {
  const context = (error as { context?: Response } | undefined)?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // response body wasn't JSON — fall through
    }
  }
  // No readable body means the request never completed or came back without
  // CORS headers (e.g. a platform-level crash). supabase-js's own message for
  // that is the English "Failed to send a request to the Edge Function",
  // which reads to a user as if they did something wrong — replace it with
  // something honest and actionable in Arabic.
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message.includes("Failed to send a request")) {
      return "تعذّر الوصول إلى الخادم. تحقّق من اتصالك ثم حاول مرة أخرى.";
    }
    return message;
  }
  return undefined;
}
