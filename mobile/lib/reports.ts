import { supabase } from "@/lib/supabase";

export async function submitReport(params: {
  targetType: "listing" | "user";
  targetId: string;
  reason: string;
}): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "سجّل الدخول للإبلاغ." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: params.targetType,
    target_id: params.targetId,
    reason: params.reason,
  });

  if (error) {
    console.error("[reports] submit failed", error);
    return { error: "تعذّر إرسال البلاغ الآن. حاول مرة أخرى." };
  }
  return {};
}
