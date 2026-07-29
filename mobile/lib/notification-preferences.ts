import { supabase } from "@/lib/supabase";

/**
 * Which categories of notification the user wants.
 *
 * Enforcement is server-side (a trigger on notifications — migration 0050),
 * not here: turning a category off has to hold for notifications produced by
 * database triggers and Edge Functions the app never runs.
 *
 * No row means "everything on", so a user who has never opened this screen
 * keeps the original behaviour and no backfill was needed.
 */

export type NotificationPreferences = {
  new_message: boolean;
  listing_status: boolean;
  verification: boolean;
  promotion: boolean;
  saved_search: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  new_message: true,
  listing_status: true,
  verification: true,
  promotion: true,
  saved_search: true,
};

export const NOTIFICATION_CATEGORY_LABELS: Record<
  keyof NotificationPreferences,
  { title: string; description: string }
> = {
  new_message: {
    title: "الرسائل",
    description: "عند وصول رسالة جديدة في محادثاتك.",
  },
  listing_status: {
    title: "حالة إعلاناتي",
    description: "عند نشر إعلانك أو رفضه بعد المراجعة.",
  },
  verification: {
    title: "التوثيق المالي",
    description: "تحديثات طلبات التوثيق التي قدّمتها.",
  },
  promotion: {
    title: "التمييز",
    description: "عند تفعيل تمييز إعلانك أو انتهائه.",
  },
  saved_search: {
    title: "تنبيهات البحث المحفوظ",
    description: "عند ظهور فرصة أو امتياز يطابق بحثك المحفوظ.",
  },
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("new_message, listing_status, verification, promotion, saved_search")
    .maybeSingle();

  if (error) {
    console.error("[notification-preferences] load failed", error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(data ?? {}) };
}

export async function setNotificationPreference(
  key: keyof NotificationPreferences,
  value: boolean,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  // Typed separately from the spread below: a computed key inside the object
  // literal widens to string and loses the column typing entirely.
  const patch: Partial<NotificationPreferences> = { [key]: value };

  // upsert rather than update: the row only exists once the user has changed
  // something, since absent means "all on".
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });

  if (error) {
    console.error("[notification-preferences] save failed", error);
    return { error: "تعذّر حفظ التفضيل." };
  }
  return {};
}
