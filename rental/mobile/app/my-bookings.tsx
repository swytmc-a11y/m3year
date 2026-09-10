import { useCallback, useState } from "react";
import { View, Text, FlatList, useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Button, Card, EmptyState, PageHeader, Skeleton, Tappable, useTabBarSpacing } from "@/components/kit";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { listMyBookings, OPEN_STATUSES, type MyBooking } from "@/lib/bookings-data";
import { BOOKING_STATUS_LABELS, formatSar, formatDateShort, carTitle } from "@/lib/constants";
import { fonts, radius } from "@/theme";
import { carImageSource } from "@/lib/car-images";

export default function MyBookingsScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const { session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<MyBooking[] | null>(null);
  const { width } = useWindowDimensions();
  const columns = width >= 980 ? 2 : 1;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const next = await listMyBookings();
        if (active) setRows(next);
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
      <PageHeader title="حجوزاتي" subtitle="تابع حالة حجوزاتك ومدفوعاتك في مكان واحد" onBack={() => router.back()} />

      {rows === null ? (
        <View style={{ padding: 18, gap: 14 }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} width="100%" height={120} radius={radius.xl} />
          ))}
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          title="لا توجد حجوزات"
          description="ابدأ بتصفّح السيارات واحجز واحدة."
          action={<Button label="تصفّح السيارات" onPress={() => router.push("/")} />}
        />
      ) : (
        <FlatList
          key={columns}
          data={rows}
          numColumns={columns}
          keyExtractor={(b) => b.id}
          style={{ width: "100%", maxWidth: 1180, alignSelf: "center" }}
          columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
          contentContainerStyle={{ paddingHorizontal: width >= 900 ? 28 : 18, gap: 12, paddingBottom: tabSpacing }}
          renderItem={({ item }) => (
            <Tappable onPress={() => router.push(`/bookings/${item.id}`)} haptic="light" style={{ flex: 1 }}>
              <Card style={{ padding: 14, flexDirection: "row-reverse", gap: 14, alignItems: "center" }}>
                {item.car ? (
                  <Image
                    source={carImageSource(item.car)}
                    style={{ width: 92, height: 64, borderRadius: radius.lg, backgroundColor: t.surface2 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={{ width: 92, height: 64, borderRadius: radius.lg, backgroundColor: t.surface2 }} />
                )}

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontFamily: fonts.numeric, fontSize: 12, color: t.primary }}>
                      {item.reference}
                    </Text>
                    <StatusPill status={item.status} />
                  </View>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
                    {item.car ? carTitle(item.car) : "سيارة محذوفة"}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "right" }}>
                    {formatDateShort(item.start_date)} — {formatDateShort(item.end_date)} ·{" "}
                    {formatSar(Number(item.total))}
                  </Text>
                </View>
              </Card>
            </Tappable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

export function StatusPill({ status }: { status: MyBooking["status"] }) {
  const { t } = useTheme();
  const open = OPEN_STATUSES.includes(status);
  const bad = status === "cancelled" || status === "rejected" || status === "expired";
  const bg = bad ? t.dangerTint : open ? `${t.primary}1F` : t.surface2;
  const fg = bad ? t.danger : open ? t.primary : t.textMuted;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: fg }}>
        {BOOKING_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}
