import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter, useFocusEffect, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Logo } from "@/components/logo";
import { Button, Card, EmptyState, Skeleton, Tappable, staggerEnter, useRefreshTint, useTabBarSpacing } from "@/components/kit";
import { ChatIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { listMyConversations, type ConversationSummary } from "@/lib/messaging";
import { fonts, radius } from "@/theme";

const AR_MONTHS_SHORT = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return `${d.getDate()} ${AR_MONTHS_SHORT[d.getMonth()]}`;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const { session, loading: authLoading } = useAuth();
  const refreshTint = useRefreshTint();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: err } = await listMyConversations();
    if (err) setError(true);
    else setConversations(data ?? []);
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
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: t.text, textAlign: "center" }}>
            سجّل الدخول لعرض محادثاتك
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted, textAlign: "center", lineHeight: 22 }}>
            تحتاج حسابًا للتواصل مع أصحاب المشاريع أو الممولين.
          </Text>
          <Link href="/auth" asChild>
            <Button label="تسجيل الدخول" />
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
        <Logo size={20} />
      </View>

      <FlatList
        data={conversations ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 18, paddingTop: 4, paddingBottom: tabSpacing, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshTint} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={staggerEnter(Math.min(index, 8))}>
            <Tappable onPress={() => router.push(`/messages/${item.id}`)} haptic="light">
              <Card style={{ padding: 16 }}>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
                      {item.counterpart_name || "مستخدم"}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, marginTop: 2, textAlign: "right" }}>
                      {item.listing_title}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.numeric, fontSize: 10.5, color: t.textMuted, direction: "ltr" }}>
                    {formatWhen(item.last_message_at)}
                  </Text>
                </View>

                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                    {item.last_message || "لا توجد رسائل بعد"}
                  </Text>
                  {item.unread_count > 0 ? (
                    <View
                      style={{
                        marginRight: 8,
                        minWidth: 20,
                        height: 20,
                        borderRadius: 10,
                        paddingHorizontal: 6,
                        backgroundColor: t.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontFamily: fonts.numericBold, fontSize: 10.5, color: t.onPrimary }}>
                        {item.unread_count}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </Tappable>
          </Animated.View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={72} radius={radius.xl} />
              ))}
            </View>
          ) : error ? (
            <EmptyState
              title="تعذّر التحميل"
              description="تعذّر تحميل المحادثات الآن."
              action={<Button label="إعادة المحاولة" variant="secondary" onPress={() => load()} />}
            />
          ) : (
            <EmptyState
              icon={<ChatIcon focused={false} color={t.textMuted} size={20} />}
              title="لا توجد محادثات بعد"
              description="تبدأ المحادثة عند تواصلك مع صاحب فرصة أو امتياز."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
