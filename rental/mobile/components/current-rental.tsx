import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Tappable } from "@/components/kit";
import { CalendarIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import type { MyBooking } from "@/lib/bookings-data";
import { countAr, DAYS_NOUN } from "@/lib/arabic";
import { carTitle, formatDate } from "@/lib/constants";
import { todayIso, daysBetween } from "@/lib/dates";
import { fonts, radius } from "@/theme";

/**
 * How the rental reads today, in the words a renter would use.
 *
 * The end date is exclusive — a booking ending on the 3rd is returned on the
 * 3rd — so "days left" counts to that date and hits zero on the day itself.
 */
function statusLine(booking: MyBooking): string {
  const today = todayIso();

  if (booking.status === "confirmed") {
    const until = daysBetween(today, booking.start_date);
    if (until <= 0) return "الاستلام اليوم";
    if (until === 1) return "الاستلام غدًا";
    return `الاستلام بعد ${countAr(until, DAYS_NOUN)}`;
  }

  const left = daysBetween(today, booking.end_date);
  if (left <= 0) return "التسليم اليوم";
  if (left === 1) return "التسليم غدًا";
  return `متبقٍ ${countAr(left, DAYS_NOUN)}`;
}

export function CurrentRentalCard({ booking }: { booking: MyBooking }) {
  const router = useRouter();
  const { t } = useTheme();

  return (
    <View style={{ paddingHorizontal: 18 }}>
      <Tappable
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="إيجارك الحالي"
        onPress={() => router.push(`/bookings/${booking.id}`)}
      >
        <View style={{ backgroundColor: t.canvas, borderRadius: radius.xl, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.onCanvasMuted }}>
              {booking.status === "active" ? "إيجارك الحالي" : "حجزك القادم"}
            </Text>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6,
                backgroundColor: t.accent,
                borderRadius: radius.pill,
                paddingHorizontal: 12,
                paddingVertical: 5,
              }}
            >
              <CalendarIcon color={t.onAccent} size={13} />
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 11.5, color: t.onAccent }}>
                {statusLine(booking)}
              </Text>
            </View>
          </View>

          <View style={{ gap: 3 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, color: t.onCanvas, textAlign: "right" }}>
              {booking.car ? carTitle(booking.car) : "سيارة محذوفة"}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.onCanvasMuted, textAlign: "right" }}>
              {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
              {booking.branch ? ` · ${booking.branch.name}` : ""}
            </Text>
          </View>

          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: fonts.numericBold, fontSize: 13, color: t.onCanvas }}>
              {booking.reference}
            </Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: t.accent }}>
              التفاصيل والتمديد ←
            </Text>
          </View>
        </View>
      </Tappable>
    </View>
  );
}
