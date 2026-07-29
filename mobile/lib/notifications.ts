import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
};

const PAGE_SIZE = 30;

export async function listMyNotifications(page = 0): Promise<{
  data?: AppNotification[];
  hasMore?: boolean;
  error?: string;
}> {
  const from = page * PAGE_SIZE;
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error("[notifications] list failed", error);
    return { error: "تعذّر تحميل الإشعارات الآن." };
  }
  return { data: data ?? [], hasMore: (data ?? []).length === PAGE_SIZE };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) {
    console.error("[notifications] unread count failed", error);
    return 0;
  }
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) console.error("[notifications] mark read failed", error);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) console.error("[notifications] mark all read failed", error);
}
