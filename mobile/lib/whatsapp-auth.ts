import { supabase } from "@/lib/supabase";

type SendResult = { error?: string };
type VerifyResult = { needsName?: boolean; error?: string };

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
 * Verifies the OTP. If the phone has no account yet and `fullName` wasn't
 * provided, returns { needsName: true } — call again with fullName set to
 * actually create the account (the OTP is re-checked against Authentica
 * every time, so a stale code can't be replayed to create an account).
 * On success, the session is already set on the shared `supabase` client.
 */
export async function verifyWhatsAppOtp(
  phone: string,
  otp: string,
  fullName?: string,
): Promise<VerifyResult> {
  const { data, error } = await supabase.functions.invoke("verify-whatsapp-otp", {
    body: fullName ? { phone, otp, fullName } : { phone, otp },
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
