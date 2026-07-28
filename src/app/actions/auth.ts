"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validations/auth";

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

// requestOtp/verifyOtp used to live here, driving Supabase's built-in SMS OTP
// (signInWithOtp + verifyOtp type:"sms"). No SMS provider was ever configured
// on the project, so both could only ever fail — and phone login has since
// moved entirely to the WhatsApp/Authentica bridge on mobile. They were
// unreachable from any UI but still callable as Server Actions, so they and
// the /auth/verify page they fed are removed rather than left as dead
// authentication surface.

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
