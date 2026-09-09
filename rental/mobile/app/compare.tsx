import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, IconButton, Skeleton, Tappable } from "@/components/kit";
import { CarIcon, ChevronBackIcon, StarIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import {
  CAR_CATEGORY_LABELS,
  TRANSMISSION_LABELS,
  FUEL_LABELS,
  type CarCategory,
  type TransmissionType,
  type FuelType,
} from "@/lib/constants";
import { fonts, radius } from "@/theme";

type CompareCar = {
  id: string;
  make: string;
  make_latin: string | null;
  model: string;
  year: number;
  category: CarCategory;
  transmission: TransmissionType;
  fuel: FuelType;
  seats: number;
  doors: number | null;
  daily_price: number | string;
  weekly_price: number | string | null;
  monthly_price: number | string | null;
  daily_km_limit: number | null;
  extra_km_fee: number | string | null;
  cover_image: string | null;
  rating_avg: number | string | null;
  rating_count: number;
  branch: { id: string; name: string; city: string } | null;
};

const COLUMN_WIDTH = 168;

export default function CompareScreen() {
  const router = useRouter();
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const { t } = useTheme();

  const [cars, setCars] = useState<CompareCar[] | null>(null);

  useEffect(() => {
    const wanted = (ids ?? "").split(",").filter(Boolean);
    if (wanted.length === 0) {
      setCars([]);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("cars")
        .select(
          "id, make, make_latin, model, year, category, transmission, fuel, seats, doors, daily_price, weekly_price, monthly_price, daily_km_limit, extra_km_fee, cover_image, rating_avg, rating_count, branch:branches(id, name, city)",
        )
        .in("id", wanted);

      if (!active) return;
      if (error) {
        console.error("[compare] load failed", error);
        setCars([]);
        return;
      }
      // Keep the order the customer picked them in, which `in` does not.
      const byId = new Map((data ?? []).map((c) => [c.id, c as unknown as CompareCar]));
      setCars(wanted.map((id) => byId.get(id)).filter((c): c is CompareCar => c != null));
    })();
    return () => {
      active = false;
    };
  }, [ids]);

  const prices = (cars ?? []).map((c) => Number(c.daily_price));
  const cheapest = prices.length > 0 ? Math.min(...prices) : null;
  const ratings = (cars ?? [])
    .filter((c) => c.rating_count > 0 && c.rating_avg != null)
    .map((c) => Number(c.rating_avg));
  const bestRating = ratings.length > 0 ? Math.max(...ratings) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>مقارنة</Text>
      </View>

      {cars === null ? (
        <View style={{ padding: 18, gap: 14 }}>
          <Skeleton width="100%" height={220} radius={radius.xl} />
          <Skeleton width="100%" height={160} radius={radius.lg} />
        </View>
      ) : cars.length < 2 ? (
        <View style={{ padding: 18, gap: 14 }}>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 13.5,
              color: t.text,
              textAlign: "right",
              lineHeight: 23,
            }}
          >
            اختر سيارتين على الأقل من نتائج البحث لمقارنتهما.
          </Text>
          <Button label="رجوع للبحث" onPress={() => router.back()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}
          >
            {cars.map((car) => (
              <View key={car.id} style={{ width: COLUMN_WIDTH, gap: 10 }}>
                <Tappable onPress={() => router.push(`/cars/${car.id}` as never)} haptic="light">
                  <View
                    style={{
                      height: 96,
                      backgroundColor: t.well,
                      borderRadius: radius.lg,
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {car.cover_image ? (
                      <Image
                        source={{ uri: car.cover_image }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <CarIcon color={t.textMuted} size={30} />
                    )}
                  </View>
                </Tappable>

                <View style={{ gap: 2 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontFamily: fonts.displayBold,
                      fontSize: 13.5,
                      color: t.text,
                      textAlign: "right",
                    }}
                  >
                    {car.make} {car.model}
                  </Text>
                  <Text
                    style={{ fontFamily: fonts.numeric, fontSize: 11, color: t.textMuted, textAlign: "right" }}
                  >
                    {car.year}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ height: 18 }} />

          <CompareRow
            label="السعر اليومي"
            cars={cars}
            render={(c) => `${Math.round(Number(c.daily_price))} ر.س`}
            // The winning cell is marked rather than ranked in prose: the
            // point of a comparison is to see the answer, not read it.
            highlight={(c) => cheapest != null && Number(c.daily_price) === cheapest}
          />
          <CompareRow
            label="السعر الأسبوعي"
            cars={cars}
            render={(c) => (c.weekly_price ? `${Math.round(Number(c.weekly_price))} ر.س` : "—")}
          />
          <CompareRow
            label="السعر الشهري"
            cars={cars}
            render={(c) => (c.monthly_price ? `${Math.round(Number(c.monthly_price))} ر.س` : "—")}
          />
          <CompareRow
            label="التقييم"
            cars={cars}
            render={(c) =>
              c.rating_count > 0 && c.rating_avg != null ? Number(c.rating_avg).toFixed(1) : "—"
            }
            highlight={(c) =>
              bestRating != null && c.rating_count > 0 && Number(c.rating_avg) === bestRating
            }
            icon
          />
          <CompareRow label="الفئة" cars={cars} render={(c) => CAR_CATEGORY_LABELS[c.category]} />
          <CompareRow
            label="ناقل الحركة"
            cars={cars}
            render={(c) => TRANSMISSION_LABELS[c.transmission]}
          />
          <CompareRow label="الوقود" cars={cars} render={(c) => FUEL_LABELS[c.fuel]} />
          <CompareRow label="الركاب" cars={cars} render={(c) => `${c.seats}`} />
          <CompareRow label="الأبواب" cars={cars} render={(c) => (c.doors ? `${c.doors}` : "—")} />
          <CompareRow
            label="حد الكيلومترات"
            cars={cars}
            render={(c) => (c.daily_km_limit ? `${c.daily_km_limit} كم / يوم` : "بلا حد")}
          />
          <CompareRow
            label="الكيلومتر الإضافي"
            cars={cars}
            render={(c) => (c.extra_km_fee ? `${Number(c.extra_km_fee)} ر.س` : "—")}
          />
          <CompareRow label="الفرع" cars={cars} render={(c) => c.branch?.name ?? "—"} />

          <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {cars.map((car) => (
                <View key={car.id} style={{ width: COLUMN_WIDTH }}>
                  <Button
                    label="عرض التفاصيل"
                    fullWidth
                    onPress={() => router.push(`/cars/${car.id}` as never)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function CompareRow({
  label,
  cars,
  render,
  highlight,
  icon,
}: {
  label: string;
  cars: CompareCar[];
  render: (car: CompareCar) => string;
  highlight?: (car: CompareCar) => boolean;
  icon?: boolean;
}) {
  const { t } = useTheme();
  return (
    <View style={{ paddingTop: 12 }}>
      <Text
        style={{
          fontFamily: fonts.bodySemiBold,
          fontSize: 11.5,
          color: t.textMuted,
          textAlign: "right",
          paddingHorizontal: 18,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}
      >
        {cars.map((car) => {
          const best = highlight?.(car) ?? false;
          return (
            <View
              key={car.id}
              style={{
                width: COLUMN_WIDTH,
                backgroundColor: best ? t.accentTint : t.surface,
                borderWidth: 1,
                borderColor: best ? t.accent : t.border,
                borderRadius: radius.md,
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 5,
              }}
            >
              {icon && best ? <StarIcon color={t.warning} size={11} /> : null}
              <Text
                style={{
                  fontFamily: best ? fonts.numericBold : fonts.bodyMedium,
                  fontSize: 12.5,
                  color: t.text,
                }}
              >
                {render(car)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
