import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, EmptyState, IconButton, Skeleton, Tappable, useRefreshTint } from "@/components/kit";
import { BellIcon, ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notifications";
import { AR_MONTHS_SHORT } from "@/lib/constants";
import { fonts, radius } from "@/theme";

// Today and yesterday are the common cases and read better as words. An
// older notification keeps its date, and one from another year keeps its
// year too — without it, a notification from last October is indistinguishable
// from this October's.
function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const daysAgo = Math.round((dayStart(now) - dayStart(d)) / 86400000);

  if (daysAgo === 0) return "اليوم";
  if (daysAgo === 1) return "أمس";

  const date = `${d.getDate()} ${AR_MONTHS_SHORT[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? date : `${date} ${d.getFullYear()}`;
}

// Where each notification category leads. The payload carries the ids, so
// a booking notification opens that booking and a saved-search match opens
// the car it matched.
const CATEGORY_ROUTE: Record<string, (data: Record<string, unknown>) => string | undefined> = {
  booking_updates: (d) => {
    // A finished rental asks for a rating, so its notification opens the
    // review form rather than the booking the customer has already lived.
    if (d.action === "review" && d.booking_id) return `/review/${d.booking_id}`;
    return d.booking_id ? `/bookings/${d.booking_id}` : "/my-bookings";
  },
  reminders: (d) => (d.booking_id ? `/bookings/${d.booking_id}` : "/my-bookings"),
  saved_search_alerts: (d) => (d.car_id ? `/cars/${d.car_id}` : undefined),
  offers: (d) => {
    if (d.action === "verify_phone") return "/verify-phone";
    return d.car_id ? `/cars/${d.car_id}` : undefined;
  },
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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: err, hasMore: more } = await listNotifications(0);
    if (err) setError(true);
    else {
      setItems(data ?? []);
      setHasMore(Boolean(more));
    }
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading || error || !items) return;
    setLoadingMore(true);
    const page = Math.floor(items.length / 30);
    const { data, error: err, hasMore: more } = await listNotifications(page);
    if (!err) {
      setItems((prev) => [...(prev ?? []), ...(data ?? [])]);
      setHasMore(Boolean(more));
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, loading, error, items]);

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
    const route = CATEGORY_ROUTE[item.category]?.(item.data ?? {});
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        ListFooterComponent={loadingMore ? <Skeleton width="100%" height={64} radius={radius.xl} /> : null}
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
              description="ستصلك هنا تحديثات حجوزاتك وتذكيرات الاستلام والتسليم."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
