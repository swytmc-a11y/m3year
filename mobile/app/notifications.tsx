import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, EmptyState, IconButton, Skeleton, Tappable, useRefreshTint } from "@/components/kit";
import { BellIcon, ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notifications";
import { fonts, radius } from "@/theme";

const AR_MONTHS_SHORT = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${AR_MONTHS_SHORT[d.getMonth()]}`;
}

const TYPE_ROUTE: Record<string, (relatedId: string) => string> = {
  new_message: (id) => `/messages/${id}`,
  listing_published: (id) => `/listings/${id}`,
  listing_rejected: () => "/my-ads",
  verification_completed: (id) => `/listings/${id}`,
  verification_rejected: () => "/my-ads",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, loading: authLoading } = useAuth();
  const refreshTint = useRefreshTint();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: err } = await listMyNotifications();
    if (err) setError(true);
    else setItems(data ?? []);
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [load, session]),
  );

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  async function onPressItem(item: AppNotification) {
    if (!item.read_at) {
      await markNotificationRead(item.id);
      setItems((prev) =>
        (prev ?? []).map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
    }
    const route = item.related_id ? TYPE_ROUTE[item.type]?.(item.related_id) : undefined;
    if (route) router.push(route as never);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 10 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
          <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
            <ChevronBackIcon color={t.text} />
          </IconButton>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>الإشعارات</Text>
        </View>
        <Button
          label="تعليم الكل كمقروء"
          variant="secondary"
          onPress={async () => {
            await markAllNotificationsRead();
            load();
          }}
        />
      </View>
      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 10, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshTint} />}
        renderItem={({ item }) => (
          <Tappable onPress={() => onPressItem(item)} haptic="light">
            <View
              style={{
                backgroundColor: item.read_at ? t.surface : `${t.primary}12`,
                borderRadius: radius.xl,
                padding: 16,
                gap: 4,
                ...t.shadowSm,
              }}
            >
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: t.text, textAlign: "right" }}>
                  {item.title}
                </Text>
                <Text style={{ fontFamily: fonts.numeric, fontSize: 10.5, color: t.textMuted }}>
                  {formatWhen(item.created_at)}
                </Text>
              </View>
              {item.body ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                  {item.body}
                </Text>
              ) : null}
            </View>
          </Tappable>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 10 }}>
              <Skeleton width="100%" height={64} radius={radius.xl} />
              <Skeleton width="100%" height={64} radius={radius.xl} />
            </View>
          ) : error ? (
            <EmptyState
              title="تعذّر التحميل"
              description="تعذّر تحميل الإشعارات الآن."
              action={<Button label="إعادة المحاولة" variant="secondary" onPress={() => load()} />}
            />
          ) : (
            <EmptyState
              icon={<BellIcon color={t.textMuted} size={20} />}
              title="لا إشعارات بعد"
              description="ستصلك هنا تحديثات إعلاناتك ومحادثاتك."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
