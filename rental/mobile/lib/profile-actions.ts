import { supabase } from "@/lib/supabase";

/**
 * Null means the account has no verified phone — either it signed up by
 * email and never went through phone verification, or (before the fix that
 * closed it) it typed one in at signup that was never actually proven and
 * so was dropped rather than trusted.
 */
export async function fetchMyPhone(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  return data?.phone ?? null;
}

export async function updateMyProfile(params: {
  fullName: string;
  city: string;
}): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: params.fullName, city: params.city })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update failed", error);
    return { error: "تعذّر حفظ التعديلات الآن. حاول مرة أخرى." };
  }
  return {};
}
