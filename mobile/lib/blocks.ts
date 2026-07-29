import { supabase } from "@/lib/supabase";

/**
 * Blocking one specific user, as opposed to profiles.is_blocked, which is an
 * admin banning an account platform-wide.
 *
 * A block cuts the conversation both ways: neither side can send afterwards.
 * The database enforces that — see migration 0048 — so nothing here is
 * relied on for safety, only for telling the user what happened.
 *
 * Only the blocker can read their own block rows. That is deliberate: the
 * blocked party must never be able to tell they were blocked, so the app can
 * only ever answer "am I blocking them", never "are they blocking me".
 */

export type BlockedUser = {
  blocked_id: string;
  created_at: string;
  full_name: string | null;
};

export async function isBlockedByMe(otherUserId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", otherUserId)
    .maybeSingle();
  return !!data;
}

export async function blockUser(otherUserId: string): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: user.id, blocked_id: otherUserId });
  if (error) {
    console.error("[blocks] block failed", error);
    return { error: "تعذّر حظر المستخدم الآن." };
  }
  return {};
}

export async function unblockUser(otherUserId: string): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", otherUserId);
  if (error) {
    console.error("[blocks] unblock failed", error);
    return { error: "تعذّر إلغاء الحظر الآن." };
  }
  return {};
}

export async function listBlockedUsers(): Promise<{ data?: BlockedUser[]; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_id, created_at, profiles!user_blocks_blocked_id_fkey(full_name)")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[blocks] list failed", error);
    return { error: "تعذّر تحميل قائمة المحظورين." };
  }

  const rows = (data ?? []).map((row) => {
    const r = row as unknown as {
      blocked_id: string;
      created_at: string;
      profiles: { full_name: string | null } | null;
    };
    return {
      blocked_id: r.blocked_id,
      created_at: r.created_at,
      full_name: r.profiles?.full_name ?? null,
    };
  });
  return { data: rows };
}
