import { supabase } from "@/lib/supabase";

type SendResult = { error?: string };
type VerifyResult = { needsName?: boolean; error?: string };

export async function sendWhatsAppOtp(phone: string): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-whatsapp-otp", {
    body: { phone },
  });
  if (error) {
    console.error("[whatsapp-auth] send failed", error);
    return { error: extractMessage(error) ?? "تعذّر إرسال رمز التحقق الآن." };
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
    return { error: extractMessage(error) ?? "تعذّر التحقق من الرمز الآن." };
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

function extractMessage(error: unknown): string | undefined {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return undefined;
}
