"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestOtpSchema, verifyOtpSchema } from "@/lib/validations/auth";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function requestOtp(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestOtpSchema.safeParse({
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
  });

  if (error) {
    console.error("[auth] signInWithOtp failed", error);
    return {
      error: "تعذّر إرسال رمز التحقق الآن. حاول مرة أخرى بعد قليل.",
    };
  }

  redirect(`/auth/verify?phone=${encodeURIComponent(parsed.data.phone)}`);
}

export async function verifyOtp(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = verifyOtpSchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.code,
    type: "sms",
  });

  if (error) {
    console.error("[auth] verifyOtp failed", error);
    return { error: "رمز التحقق غير صحيح أو منتهي الصلاحية." };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// --- TEMPORARY: demo email/password login for preview -----------------------
// Lets reviewers try the full app before an SMS provider is configured for the
// real phone-OTP flow. REMOVE this action and the /auth/demo route (and the
// demo accounts) before a public launch.
const DEMO_ACCOUNTS = {
  owner: { email: "owner@miyar.demo", password: "Demo123456" },
  admin: { email: "admin@miyar.demo", password: "Demo123456" },
} as const;

export async function enterDemo(formData: FormData) {
  const as = formData.get("as") === "admin" ? "admin" : "owner";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(DEMO_ACCOUNTS[as]);

  if (error) {
    console.error("[auth] demo sign-in failed", error);
    redirect("/auth/demo?error=1");
  }

  redirect(as === "admin" ? "/admin/listings" : "/dashboard/listings");
}
