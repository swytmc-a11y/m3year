import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Tappable, Card, staggerEnter } from "@/components/kit";
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
  branch: { id: string; name: string; city: string; latitude: number | null; longitude: number | null } | null;
};

export const CAR_CARD_COLUMNS =
  "id, make, model, year, category, transmission, fuel, seats, daily_price, monthly_price, cover_image, branch:branches(id, name, city, latitude, longitude)";

export function CarCard({
  car,
  index = 0,
  distanceKm,
}: {
  car: CarCardData;
  index?: number;
  distanceKm?: number | null;
}) {
  const router = useRouter();
  const { t } = useTheme();

  return (
    <Animated.View entering={staggerEnter(Math.min(index, 8))}>
      <Tappable onPress={() => router.push(`/cars/${car.id}`)} haptic="light">
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {car.cover_image ? (
            <Image
              source={{ uri: car.cover_image }}
              style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: t.surface2 }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              style={{
                width: "100%",
                aspectRatio: 16 / 9,
                backgroundColor: t.surface2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>
                بلا صورة
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
