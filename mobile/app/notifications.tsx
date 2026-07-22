import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, Button } from "@/components/ui";
import { useAuth } from "@/contexts/auth";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notifications";
import { colors, fonts, radius } from "@/theme";

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
  listing_rejected: (id) => `/my-listings`,
  verification_completed: (id) => `/listings/${id}`,
  verification_rejected: (id) => `/my-listings`,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await listMyNotifications();
    if (err) setError(true);
    else setItems(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [load, session]),
  );

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar
        title="الإشعارات"
        onBack={() => router.back()}
        right={
          <Button
            label="تعليم الكل كمقروء"
            variant="ghost"
            onPress={async () => {
              await markAllNotificationsRead();
              load();
            }}
          />
        }
      />
      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 10, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPressItem(item)}
            style={{
              backgroundColor: item.read_at ? colors.white : "rgba(217,118,43,0.06)",
              borderColor: colors.grid,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: 16,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, textAlign: "right" }}>
                {item.title}
              </Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.mutedText }}>
                {formatWhen(item.created_at)}
              </Text>
            </View>
            {item.body ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.subtleText, textAlign: "right" }}>
                {item.body}
              </Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.white,
                borderColor: colors.grid,
                borderWidth: 1,
                borderRadius: 12,
                padding: 40,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText }}>
                {error ? "تعذّر تحميل الإشعارات الآن." : "لا توجد إشعارات بعد."}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
