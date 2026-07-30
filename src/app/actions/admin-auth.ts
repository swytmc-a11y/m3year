"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPendingOtp } from "@/lib/auth";
import { z } from "zod";

export type AdminOtpState = {
  error?: string;
  sent?: boolean;
  email?: string;
};

// A fresh admin OTP session is valid for 12 hours before /admin bounces the
// operator back here — long enough for a normal work session, short enough
// that a step-up genuinely means something.
const OTP_SESSION_HOURS = 12;

/**
 * Sends the email OTP. Uses Supabase Auth's own signInWithOtp against the
 * caller's own already-authenticated email — this never creates a new user
 * (shouldCreateUser: false) and never signs anyone in on its own; it only
 * proves the operator can still read mail at the address tied to their
 * admin account, which is the actual point of a step-up factor.
 */
export async function sendAdminOtp(
  _prev: AdminOtpState,
  _formData: FormData,
): Promise<AdminOtpState> {
  const user = await requireAdminPendingOtp();
  if (!user.email) {
    return { error: "لا يوجد بريد إلكتروني على هذا الحساب." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    console.error("[admin-auth] failed to send OTP", error);
    return { error: "تعذّر إرسال رمز التحقق الآن. حاول مرة أخرى." };
  }

  return { sent: true, email: user.email };
}

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: "أدخل الرمز المكوّن من 6 أرقام." });

export async function verifyAdminOtp(
  _prev: AdminOtpState,
  formData: FormData,
): Promise<AdminOtpState> {
  const user = await requireAdminPendingOtp();
  if (!user.email) {
    return { error: "لا يوجد بريد إلكتروني على هذا الحساب." };
  }

  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email: user.email };
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: user.email,
    token: parsed.data,
    type: "email",
  });

  if (verifyError) {
    console.error("[admin-auth] OTP verify failed", verifyError);
    return { error: "الرمز غير صحيح أو منتهي الصلاحية.", email: user.email };
  }

  // Record the step-up. RLS scopes this write to the caller's own row, so
  // there is nothing here that a compromised client could redirect at
  // another admin's row even if it tried.
  const expiresAt = new Date(Date.now() + OTP_SESSION_HOURS * 60 * 60 * 1000);
  const { error: upsertError } = await supabase
    .from("admin_otp_verifications")
    .upsert({ user_id: user.id, verified_at: new Date().toISOString(), expires_at: expiresAt.toISOString() });

  if (upsertError) {
    console.error("[admin-auth] failed to record OTP verification", upsertError);
    return { error: "تم التحقق لكن تعذّر حفظ الجلسة. حاول مرة أخرى.", email: user.email };
  }

  redirect("/admin");
}
