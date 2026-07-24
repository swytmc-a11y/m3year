import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { FadeInView } from "@/components/motion";
import { useAuth } from "@/contexts/auth";
import { listMyConversations, type ConversationSummary } from "@/lib/messaging";
import { colors, fonts, radius } from "@/theme";

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
  const { session, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await listMyConversations();
    if (err) setError(true);
    else setConversations(data ?? []);
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
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 16,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.heading,
              fontSize: 18,
              color: colors.ink,
              textAlign: "center",
            }}
          >
            سجّل الدخول لعرض محادثاتك
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.mutedText,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.grid,
        }}
      >
        <Logo size={22} />
      </View>

      <FlatList
        data={conversations ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}
        renderItem={({ item, index }) => (
          <FadeInView delay={Math.min(index, 8) * 45}>
          <Pressable
            onPress={() => router.push(`/messages/${item.id}`)}
            style={({ pressed }) => ({
              backgroundColor: colors.white,
              borderColor: colors.grid,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: 16,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodyBold,
                    fontSize: 15,
                    color: colors.ink,
                    textAlign: "right",
                  }}
                >
                  {item.counterpart_name || "مستخدم"}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    color: colors.mutedText,
                    marginTop: 2,
                    textAlign: "right",
                  }}
                >
                  {item.listing_title}
                </Text>
              </View>
              <Text
                style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.mutedText }}
              >
                {formatWhen(item.last_message_at)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.subtleText,
                  textAlign: "right",
                }}
              >
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
                    backgroundColor: colors.amber,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white }}
                  >
                    {item.unread_count}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          </FadeInView>
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
              <Text
                style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText }}
              >
                {error ? "تعذّر تحميل المحادثات الآن." : "لا توجد محادثات بعد."}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
