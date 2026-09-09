import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Tappable, Card, staggerEnter } from "@/components/kit";
import { CarIcon } from "@/components/icons";
import { RatingStars } from "@/components/rating";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";
import {
  CAR_CATEGORY_LABELS,
  TRANSMISSION_LABELS,
  FUEL_LABELS,
  formatSar,
  carTitle,
  type CarCategory,
  type TransmissionType,
  type FuelType,
} from "@/lib/constants";

/**
 * Exactly the columns the card renders. The feed selects these rather than
 * `*` so browsing never pulls every car's description text — the biggest
 * contributor to payload size and not shown here.
 */
export type CarCardData = {
  id: string;
  make: string;
  model: string;
  year: number;
  category: CarCategory;
  transmission: TransmissionType;
  fuel: FuelType;
  seats: number;
  daily_price: number;
  monthly_price: number | null;
  cover_image: string | null;
  rating_avg: number | null;
  rating_count: number;
  branch: { id: string; name: string; city: string; latitude: number | null; longitude: number | null } | null;
};

export const CAR_CARD_COLUMNS =
  "id, make, model, year, category, transmission, fuel, seats, daily_price, monthly_price, cover_image, rating_avg, rating_count, branch:branches(id, name, city, latitude, longitude)";

export function CarCard({
  car,
  index = 0,
  distanceKm,
  dates,
}: {
  car: CarCardData;
  index?: number;
  distanceKm?: number | null;
  /** Carried through so the dates chosen while browsing survive the tap. */
  dates?: { start: string; end: string } | null;
}) {
  const router = useRouter();
  const { t } = useTheme();

  const href = dates
    ? `/cars/${car.id}?from=${dates.start}&to=${dates.end}`
    : `/cars/${car.id}`;

  return (
    <Animated.View entering={staggerEnter(Math.min(index, 8))}>
      <Tappable onPress={() => router.push(href as never)} haptic="light">
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {car.cover_image ? (
            <View>
              <Image
                source={{ uri: car.cover_image }}
                style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: t.surface2 }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              {/* Only shown when dates are in play. Every car in the list is
                  available by then, so this confirms the search rather than
                  labelling cars at random. */}
              {dates ? (
                <View
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: radius.pill,
                    backgroundColor: "rgba(0,0,0,0.6)",
                  }}
                >
                  <View
                    style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#4ADE80" }}
                  />
                  <Text
                    style={{ fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: "#FFFFFF" }}
                  >
                    متاحة في تواريخك
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            // A photo the operator hasn't uploaded yet is not an error, so the
            // placeholder carries the car's own name rather than announcing an
            // absence — the card still reads as a car, not a broken image.
            <View
              style={{
                width: "100%",
                aspectRatio: 16 / 9,
                backgroundColor: t.surface2,
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <CarIcon color={t.textMuted} size={44} />
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 12.5,
                  color: t.textMuted,
                  textAlign: "center",
                }}
              >
                {carTitle(car)}
              </Text>
            </View>
          )}

          <View style={{ padding: 18 }}>
            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontFamily: fonts.displayBold, fontSize: 16, color: t.text, textAlign: "right" }}
                >
                  {carTitle(car)}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: t.textMuted,
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {CAR_CATEGORY_LABELS[car.category]}
                  {car.branch ? ` · ${car.branch.name}` : ""}
                  {distanceKm != null ? ` · ${formatDistance(distanceKm)}` : ""}
                </Text>
                {/* Renders nothing until the car has been reviewed — an
                    empty rating row on a new fleet reads as zero stars. */}
                <View style={{ marginTop: 6, alignItems: "flex-end" }}>
                  <RatingStars value={car.rating_avg} count={car.rating_count} />
                </View>
              </View>

              {/* The price is the thing people compare, so it gets the
                  tabular face and the strongest weight on the card. */}
              <View style={{ alignItems: "flex-start" }}>
                <Text style={{ fontFamily: fonts.numericBold, fontSize: 18, color: t.text }}>
                  {formatSar(Number(car.daily_price))}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                  لليوم · شامل الضريبة
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row-reverse",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 14,
              }}
            >
              <Spec label={TRANSMISSION_LABELS[car.transmission]} />
              <Spec label={FUEL_LABELS[car.fuel]} />
              <Spec label={`${car.seats} مقاعد`} />
              {car.monthly_price ? (
                <Spec label={`شهري ${formatSar(Number(car.monthly_price))}`} highlight />
              ) : null}
            </View>
          </View>
        </Card>
      </Tappable>
    </Animated.View>
  );
}

function Spec({ label, highlight }: { label: string; highlight?: boolean }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        backgroundColor: highlight ? t.successTint : t.surface2,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.pill,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 11.5,
          color: highlight ? t.success : t.textMuted,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function formatDistance(km: number): string {
  if (km < 1) return "أقل من كم";
  if (km < 10) return `${km.toFixed(1)} كم`;
  return `${Math.round(km)} كم`;
}

/**
 * Great-circle distance. Good enough to rank branches by how near they are;
 * driving distance would need a routing service and would not change the
 * ordering in practice.
 */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
