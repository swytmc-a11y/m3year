import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

const PAGE_SIZE = 30;

/** One page of the inbox, newest first. */
export async function listNotifications(page = 0): Promise<{
  data: AppNotification[];
  error: boolean;
  hasMore: boolean;
}> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, category, title, body, data, read_at, created_at")
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (error) {
    console.error("[notifications] load failed", error);
    return { data: [], error: true, hasMore: false };
  }

  const rows = (data ?? []) as unknown as AppNotification[];
  return { data: rows, error: false, hasMore: rows.length === PAGE_SIZE };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
}
