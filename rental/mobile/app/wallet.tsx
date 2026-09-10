import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useFocusEffect, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Skeleton,
  Tappable,
  useRefreshTint,
} from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import {
  fetchWalletBalance,
  fetchWalletSettings,
  listWalletEntries,
  WALLET_KIND_LABELS,
  type WalletEntry,
  type WalletSettings,
} from "@/lib/wallet";
import { formatSar, formatDate } from "@/lib/constants";
import { fonts, radius } from "@/theme";

export default function WalletScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, loading: authLoading } = useAuth();

  const refreshTint = useRefreshTint();
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<WalletEntry[] | null>(null);
  const [settings, setSettings] = useState<WalletSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [b, rows, s] = await Promise.all([
      fetchWalletBalance(),
      listWalletEntries(),
      fetchWalletSettings(),
    ]);
    setBalance(b);
    setEntries(rows);
    setSettings(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [b, rows, s] = await Promise.all([
          fetchWalletBalance(),
          listWalletEntries(),
          fetchWalletSettings(),
        ]);
        if (!active) return;
        setBalance(b);
        setEntries(rows);
        setSettings(s);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (authLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!session) return <Redirect href="/auth" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>محفظتي</Text>
      </View>

      <FlatList
        data={entries ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 18, gap: 10, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            {...refreshTint}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 8 }}>
            {/* The balance sits on the dark canvas so it reads as money
                rather than as one more row in a list. */}
            <View
              style={{
                backgroundColor: t.canvas,
                borderRadius: radius.xl,
                padding: 22,
                gap: 6,
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.onCanvasMuted, textAlign: "right" }}>
                الرصيد المتاح
              </Text>
              {balance === null ? (
                <Skeleton width={140} height={34} radius={radius.md} />
              ) : (
                <Text style={{ fontFamily: fonts.numericBold, fontSize: 34, color: t.onCanvas, textAlign: "right" }}>
                  {formatSar(balance)}
                </Text>
              )}
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.onCanvasMuted, textAlign: "right", lineHeight: 19 }}>
                يُخصم الرصيد تلقائيًا عند اختيارك له في صفحة الحجز.
                {settings && settings.min_booking_total_to_redeem > 0
                  ? ` الحد الأدنى للحجز ${formatSar(settings.min_booking_total_to_redeem)}.`
                  : ""}
              </Text>
            </View>

            {settings?.referral_enabled ? (
              <Tappable onPress={() => router.push("/invite")} haptic="light">
                <Card style={{ padding: 18, gap: 6 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
                    ادعُ صديقًا واربح {formatSar(settings.referral_bonus)}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "right", lineHeight: 19 }}>
                    لكل صديق ينضم برابطك يدخل رصيدك {formatSar(settings.referral_bonus)}،
                    ويحصل هو على {formatSar(settings.welcome_bonus)}.
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: t.primary, textAlign: "right" }}>
                    شارك رابط الدعوة
                  </Text>
                </Card>
              </Tappable>
            ) : null}

            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right", marginTop: 4 }}>
              الحركات
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const credit = item.amount > 0;
          return (
            <Card style={{ padding: 16, gap: 4 }}>
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text, textAlign: "right", flex: 1 }}>
                  {WALLET_KIND_LABELS[item.kind]}
                </Text>
                {/* The sign is the whole point of a statement line, so it is
                    spelled out rather than left to a minus that Arabic
                    numerals push around in an RTL run. */}
                <Text
                  style={{
                    fontFamily: fonts.numericBold,
                    fontSize: 14,
                    color: credit ? t.success : t.text,
                  }}
                >
                  {credit ? "+" : "−"} {formatSar(Math.abs(item.amount))}
                </Text>
              </View>
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", gap: 12 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", flex: 1 }}>
                  {item.note ?? ""}
                </Text>
                <Text style={{ fontFamily: fonts.numeric, fontSize: 11, color: t.textMuted }}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          entries === null ? (
            <View style={{ gap: 10 }}>
              <Skeleton width="100%" height={72} radius={radius.xl} />
              <Skeleton width="100%" height={72} radius={radius.xl} />
            </View>
          ) : (
            <EmptyState
              title="لا حركات بعد"
              description="سيظهر هنا كل ما يدخل رصيدك وكل ما يُخصم منه."
              action={<Button label="ادعُ صديقًا" variant="secondary" onPress={() => router.push("/invite")} />}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
