import { View, Text } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Tappable } from "@/components/kit";
import {
  CarIcon,
  HeartIcon,
  StarIcon,
  TransmissionIcon,
  SeatsIcon,
  FuelIcon,
  ArrowLeftIcon,
} from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";
import {
  CAR_CATEGORY_LABELS,
  TRANSMISSION_LABELS,
  FUEL_LABELS,
  type CarCategory,
  type TransmissionType,
  type FuelType,
} from "@/lib/constants";

/** Exactly what a card draws — the shape home_feed() returns per car. */
export type FeedCar = {
  id: string;
  make: string;
  make_latin: string | null;
  model: string;
  year: number;
  category: CarCategory;
  transmission: TransmissionType;
  fuel: FuelType;
  seats: number;
  daily_price: number | string;
  monthly_price: number | string | null;
  cover_image: string | null;
  rating_avg: number | string | null;
  rating_count: number;
  badge: string | null;
  branch: { id: string; name: string; city: string } | null;
};

/**
 * The badge vocabulary. Every one of these is derived in SQL from the data
 * it describes (see car_badges), so a card can never claim to be the most
 * booked car in a fleet that has never been booked.
 */
const BADGES: Record<string, { label: string; tone: "accent" | "neutral" }> = {
  most_booked: { label: "الأكثر حجزًا", tone: "accent" },
  top_rated: { label: "الأعلى تقييمًا", tone: "accent" },
  smart_choice: { label: "خيار ذكي", tone: "neutral" },
  family: { label: "للرحلات العائلية", tone: "neutral" },
  unlimited_km: { label: "كيلومترات بلا حد", tone: "neutral" },
  extra_km: { label: "كيلومترات إضافية", tone: "neutral" },
};

export function CarCard({
  car,
  width,
  dates,
  favorited = false,
  onToggleFavorite,
  onCompare,
  comparing,
}: {
  car: FeedCar;
  /** Set when the card sits in a horizontal rail; unset it stretches. */
  width?: number;
  dates?: { start: string; end: string } | null;
  favorited?: boolean;
  onToggleFavorite?: (carId: string) => void;
  onCompare?: (carId: string) => void;
  comparing?: boolean;
}) {
  const router = useRouter();
  const { t } = useTheme();

  const badge = car.badge ? BADGES[car.badge] : undefined;
  const rating = car.rating_avg == null ? null : Number(car.rating_avg);
  const href = dates
    ? `/cars/${car.id}?from=${dates.start}&to=${dates.end}`
    : `/cars/${car.id}`;

  return (
    <Tappable onPress={() => router.push(href as never)} haptic="light">
      <View
        style={{
          width,
          backgroundColor: t.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: t.border,
          overflow: "hidden",
        }}
      >
        {/* The well: one neutral bed for every photo, so a studio cut-out and
            an ordinary photograph sit on the card as the same kind of
            object. `contain` rather than `cover` for the same reason — a
            cut-out cropped to fill loses its wheels. */}
        <View style={{ height: 132, backgroundColor: t.well, justifyContent: "center" }}>
          {car.cover_image ? (
            <Image
              source={{ uri: car.cover_image }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              transition={180}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={{ alignItems: "center", gap: 6 }}>
              <CarIcon color={t.textMuted} size={34} />
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted }}>
                لا توجد صورة
              </Text>
            </View>
          )}

          {badge ? (
            <View
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: radius.pill,
                backgroundColor: badge.tone === "accent" ? t.accent : t.surface,
                borderWidth: badge.tone === "accent" ? 0 : 1,
                borderColor: t.border,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodySemiBold,
                  fontSize: 10.5,
                  color: badge.tone === "accent" ? t.onAccent : t.textMuted,
                }}
              >
                {badge.label}
              </Text>
            </View>
          ) : null}

          {onToggleFavorite ? (
            <Tappable
              onPress={() => onToggleFavorite(car.id)}
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel={favorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: t.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HeartIcon color={favorited ? t.danger : t.textMuted} filled={favorited} size={15} />
            </Tappable>
          ) : null}
        </View>

        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ gap: 3 }}>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontFamily: fonts.displayBold,
                  fontSize: 14.5,
                  color: t.text,
                  textAlign: "right",
                }}
              >
                {car.make} {car.model}
              </Text>
              <Text style={{ fontFamily: fonts.numeric, fontSize: 11.5, color: t.textMuted }}>
                {car.year}
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}
            >
              {car.make_latin ? `${car.make_latin} · ` : ""}
              {CAR_CATEGORY_LABELS[car.category]}
            </Text>
          </View>

          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
            <Spec icon={<TransmissionIcon color={t.textMuted} />} label={TRANSMISSION_LABELS[car.transmission]} />
            <Spec icon={<SeatsIcon color={t.textMuted} />} label={`${car.seats} ركاب`} />
            <Spec icon={<FuelIcon color={t.textMuted} />} label={FUEL_LABELS[car.fuel]} />
          </View>

          <View style={{ height: 1, backgroundColor: t.border }} />

          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 4 }}>
              <Text style={{ fontFamily: fonts.numericBold, fontSize: 21, color: t.text }}>
                {Math.round(Number(car.daily_price))}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted }}>
                ر.س / يوم
              </Text>
            </View>

            {onCompare ? (
              <Tappable
                onPress={() => onCompare(car.id)}
                haptic="light"
                accessibilityRole="button"
                accessibilityLabel={comparing ? "إزالة من المقارنة" : "أضف للمقارنة"}
              >
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: comparing ? t.primary : t.border,
                    backgroundColor: comparing ? t.primary : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemiBold,
                      fontSize: 10.5,
                      color: comparing ? t.onPrimary : t.textMuted,
                    }}
                  >
                    {comparing ? "في المقارنة" : "قارن"}
                  </Text>
                </View>
              </Tappable>
            ) : null}
          </View>

          {/* The lime is reserved for this: the one thing on the card the
              customer is meant to press. */}
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: t.accent,
              borderRadius: radius.lg,
              paddingVertical: 11,
            }}
          >
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: t.onAccent }}>
              عرض التفاصيل
            </Text>
            <ArrowLeftIcon color={t.onAccent} size={15} />
          </View>

          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontFamily: fonts.body, fontSize: 11, color: t.textMuted, textAlign: "right" }}
            >
              {car.branch?.name ?? ""}
            </Text>
            {rating != null && car.rating_count > 0 ? (
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 3 }}>
                <StarIcon color={t.warning} size={11} />
                <Text style={{ fontFamily: fonts.numericBold, fontSize: 11, color: t.text }}>
                  {rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Tappable>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
      {icon}
      <Text style={{ fontFamily: fonts.body, fontSize: 10.5, color: t.textMuted }}>{label}</Text>
    </View>
  );
}
