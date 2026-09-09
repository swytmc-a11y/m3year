import { supabase } from "@/lib/supabase";

/**
 * Deletes the signed-in user's account permanently, cascading to every row
 * that references it (listings, franchises, messages, favorites, etc — same
 * FK cascade the schema already relies on elsewhere). Irreversible. The
 * caller is responsible for confirming intent (and re-verifying the
 * password, for accounts that have one) before calling this.
 */
export async function deleteMyAccount(): Promise<{ error?: string }> {
  const { data, error } = await supabase.functions.invoke("delete-account");
  if (error) {
    console.error("[account] delete failed", error);
    return { error: "تعذّر حذف الحساب الآن. حاول مرة أخرى." };
  }
  if (data?.error) return { error: data.error };
  return {};
}
