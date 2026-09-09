import { useCallback, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { useFocusEffect, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Button, Card, EmptyState, IconButton, Skeleton, Tappable, useTabBarSpacing } from "@/components/kit";
import { ChevronBackIcon, StarIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { listMyBookings, OPEN_STATUSES, type MyBooking } from "@/lib/bookings-data";
import { fetchReviewableBookings } from "@/lib/reviews";
import { BOOKING_STATUS_LABELS, formatSar, formatDateShort, carTitle } from "@/lib/constants";
import { fonts, radius } from "@/theme";

export default function MyBookingsScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const { session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<MyBooking[] | null>(null);
  // Which finished rentals still owe a review — drives the prompt below.
  const [awaitingReview, setAwaitingReview] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const next = await listMyBookings();
        if (active) setRows(next);

        try {
          const pending = await fetchReviewableBookings();
          if (active) setAwaitingReview(new Set(pending.map((b) => b.id)));
        } catch (err) {
          console.error("[bookings] reviewable lookup failed", err);
        }
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
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>حجوزاتي</Text>
      </View>

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
          data={rows}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: tabSpacing }}
          renderItem={({ item }) => (
            <View style={{ gap: 8 }}>
            <Tappable onPress={() => router.push(`/bookings/${item.id}`)} haptic="light">
              <Card style={{ padding: 14, flexDirection: "row-reverse", gap: 14, alignItems: "center" }}>
                {item.car?.cover_image ? (
                  <Image
                    source={{ uri: item.car.cover_image }}
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

            {/* Asked once the rental is over and only until it is answered —
                the review row disappears for good after submitting. */}
            {awaitingReview.has(item.id) ? (
              <Tappable
                onPress={() => router.push(`/review/${item.id}`)}
                haptic="light"
                accessibilityRole="button"
              >
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    backgroundColor: t.warningTint,
                    borderRadius: radius.lg,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                  }}
                >
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                    <StarIcon color={t.warning} size={14} />
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.text }}>
                      كيف كانت تجربتك؟
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: t.warning }}>
                    قيّم الآن
                  </Text>
                </View>
              </Tappable>
            ) : null}
            </View>
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
