import { supabase } from "@/lib/supabase";

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
