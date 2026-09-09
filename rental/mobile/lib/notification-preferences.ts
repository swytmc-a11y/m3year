import { supabase } from "@/lib/supabase";

/**
 * Which categories of notification the customer wants.
 *
 * No row means "everything on", so someone who never opens this screen keeps
 * the default behaviour and no backfill is needed.
 */

export type NotificationPreferences = {
  booking_updates: boolean;
  reminders: boolean;
  offers: boolean;
  saved_search_alerts: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  booking_updates: true,
  reminders: true,
  offers: true,
  saved_search_alerts: true,
};

export const NOTIFICATION_CATEGORY_LABELS: Record<
  keyof NotificationPreferences,
  { title: string; description: string }
> = {
  booking_updates: {
    title: "حالة الحجز",
    description: "عند تأكيد حجزك أو رفضه أو إلغائه.",
  },
  reminders: {
    title: "التذكيرات",
    description: "تذكير قبل موعد الاستلام وقبل موعد التسليم.",
  },
  offers: {
    title: "العروض",
    description: "عروض وخصومات على أسعار الإيجار.",
  },
  saved_search_alerts: {
    title: "تنبيهات البحث المحفوظ",
    description: "عند توفّر سيارة تطابق بحثك المحفوظ.",
  },
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("booking_updates, reminders, offers, saved_search_alerts")
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
