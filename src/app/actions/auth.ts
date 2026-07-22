"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  requestOtpSchema,
  verifyOtpSchema,
  signInSchema,
} from "@/lib/validations/auth";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function signInWithEmail(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    console.error("[auth] signInWithPassword failed", error);
    return { error: "البريد الإلكتروني أو كلمة السر غير صحيحة." };
  }

  redirect("/dashboard");
}

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
