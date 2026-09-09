import { useCallback, useState } from "react";
import { View, Text, ScrollView, Linking, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Button, Card, IconButton, Skeleton, Tappable, useToast } from "@/components/kit";
import { ChevronBackIcon, HeartIcon, CarIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { useAuth } from "@/contexts/auth";
import { fetchCarDetail, type CarDetail, type CarAddon } from "@/lib/car-detail";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { RatingStars } from "@/components/rating";
import { fetchCarReviews, formatReviewDate, type Review } from "@/lib/reviews";
import {
  CAR_CATEGORY_LABELS,
  TRANSMISSION_LABELS,
  FUEL_LABELS,
  formatSar,
  carTitle,
  tierSavingPercent,
} from "@/lib/constants";
import { fonts, radius } from "@/theme";

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const { session } = useAuth();
  const { width } = useWindowDimensions();

  const [car, setCar] = useState<CarDetail | null>(null);
  const [addons, setAddons] = useState<CarAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { car: detail, addons: rows } = await fetchCarDetail(id);
        if (!active) return;
        setCar(detail);
        setAddons(rows);
        setLoading(false);
        if (session) setFavorited(await isFavorite(id));

        // Deliberately after the car is on screen: reviews are supporting
        // detail, and waiting on them would delay the whole page.
        try {
          const list = await fetchCarReviews(id);
          if (active) setReviews(list);
        } catch (err) {
          console.error("[car] reviews load failed", err);
        }
      })();
      return () => {
        active = false;
      };
    }, [id, session]),
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <View style={{ padding: 18, gap: 16 }}>
          <Skeleton width="100%" height={220} radius={radius.xl} />
          <Skeleton width="60%" height={24} />
          <Skeleton width="100%" height={160} radius={radius.lg} />
        </View>
      </SafeAreaView>
    );
  }

  if (!car) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted }}>
            السيارة غير متاحة.
          </Text>
          <Button label="رجوع" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const images = car.images?.length ? car.images : car.cover_image ? [car.cover_image] : [];
  const branch = car.branch;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <IconButton
          accessibilityLabel={favorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          onPress={async () => {
            if (!session) {
              router.push("/auth");
              return;
            }
            const res = await toggleFavorite(car.id);
            if (res.error) toast(res.error, "error");
            else setFavorited(res.favorited);
          }}
        >
          <HeartIcon color={favorited ? t.danger : t.textMuted} filled={favorited} />
        </IconButton>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {images.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {images.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width, aspectRatio: 16 / 9, backgroundColor: t.surface2 }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ))}
          </ScrollView>
        ) : (
          // Matches the browse card: a car with no photo yet still opens onto
          // something that reads as a car, not a page that starts mid-air.
          <View
            style={{
              width,
              aspectRatio: 16 / 9,
              backgroundColor: t.surface2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CarIcon color={t.textMuted} size={56} />
          </View>
        )}

        <View style={{ padding: 18, gap: 16 }}>
          <View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: t.text, textAlign: "right" }}>
              {carTitle(car)}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, marginTop: 4, textAlign: "right" }}>
              {CAR_CATEGORY_LABELS[car.category]}
              {branch ? ` · ${branch.name} — ${branch.city}` : ""}
            </Text>
            {car.rating_count > 0 ? (
              <View style={{ marginTop: 8, alignItems: "flex-end" }}>
                <RatingStars value={car.rating_avg} count={car.rating_count} size={14} />
              </View>
            ) : null}
          </View>

          {/* Pricing tiers: the longer the rental, the lower the day rate. */}
          <Card style={{ padding: 18, gap: 14 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
              الأسعار
            </Text>
            <TierRow label="٣ أيام" rate={Number(car.daily_price)} daily={Number(car.daily_price)} />
            {car.weekly_price ? (
              <TierRow label="أسبوع" rate={Number(car.weekly_price)} daily={Number(car.daily_price)} />
            ) : null}
            {car.monthly_price ? (
              <TierRow label="شهر" rate={Number(car.monthly_price)} daily={Number(car.daily_price)} />
            ) : null}
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}>
              كل الأسعار شاملة ضريبة القيمة المضافة.
            </Text>
          </Card>

          <Card style={{ padding: 18, gap: 12 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
              المواصفات
            </Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
              <Spec label={TRANSMISSION_LABELS[car.transmission]} />
              <Spec label={FUEL_LABELS[car.fuel]} />
              <Spec label={`${car.seats} مقاعد`} />
              {car.doors ? <Spec label={`${car.doors} أبواب`} /> : null}
              {car.color ? <Spec label={car.color} /> : null}
              {car.features.map((f) => (
                <Spec key={f} label={f} />
              ))}
            </View>

            {car.daily_km_limit ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", lineHeight: 20 }}>
                حد الكيلومترات {car.daily_km_limit} كم يوميًا
                {car.extra_km_fee ? ` · بعدها ${formatSar(Number(car.extra_km_fee))} للكيلومتر` : ""}
              </Text>
            ) : null}

            {car.description ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.text, textAlign: "right", lineHeight: 22 }}>
                {car.description}
              </Text>
            ) : null}
          </Card>

          {/* Extras, priced per car. Selected during booking, shown here so
              the total is never a surprise at checkout. */}
          {addons.length > 0 ? (
            <Card style={{ padding: 18, gap: 12 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
                خدمات إضافية
              </Text>
              {addons.map((a) => (
                <View
                  key={a.addon_id}
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    paddingVertical: 6,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: t.text, textAlign: "right" }}>
                      {a.name}
                    </Text>
                    {a.description ? (
                      <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", marginTop: 2 }}>
                        {a.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontFamily: fonts.numeric, fontSize: 13, color: t.text }}>
                    {formatSar(a.price)}
                    <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted }}>
                      {a.pricing_type === "per_day" ? " / يوم" : ""}
                    </Text>
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {reviews.length > 0 ? (
            <Card style={{ padding: 18, gap: 14 }}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
                  آراء العملاء
                </Text>
                <RatingStars value={car.rating_avg} count={car.rating_count} size={12} />
              </View>

              {reviews.map((r, i) => (
                <View
                  key={r.id}
                  style={{
                    gap: 6,
                    paddingTop: i === 0 ? 0 : 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: t.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <RatingStars value={r.rating} count={1} size={11} showCount={false} />
                    <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted }}>
                      {formatReviewDate(r.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.text, textAlign: "right" }}
                  >
                    {r.author_name ?? "عميل"}
                  </Text>
                  {r.comment ? (
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 12.5,
                        color: t.textMuted,
                        textAlign: "right",
                        lineHeight: 21,
                      }}
                    >
                      {r.comment}
                    </Text>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          {branch ? (
            <Card style={{ padding: 18, gap: 12 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
                الاستلام من {branch.name}
              </Text>
              {branch.address ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                  {branch.address}
                </Text>
              ) : null}
              {branch.working_hours ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                  {branch.working_hours}
                </Text>
              ) : null}
              {branch.deposit_note ? (
                <View style={{ backgroundColor: t.surface2, borderRadius: radius.lg, padding: 12 }}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "right", lineHeight: 20 }}>
                    {branch.deposit_note}
                  </Text>
                </View>
              ) : null}

              <View style={{ flexDirection: "row-reverse", gap: 10 }}>
                {branch.phone ? (
                  <Button
                    label="اتصال"
                    variant="secondary"
                    onPress={() => Linking.openURL(`tel:${branch.phone}`)}
                  />
                ) : null}
                {branch.whatsapp ? (
                  <Button
                    label="واتساب"
                    variant="secondary"
                    onPress={() =>
                      Linking.openURL(
                        `https://wa.me/${branch.whatsapp!.replace(/[^0-9]/g, "")}`,
                      )
                    }
                  />
                ) : null}
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky booking bar: the price stays visible while the specs scroll. */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          paddingHorizontal: 18,
          paddingTop: 14,
          paddingBottom: 28,
          backgroundColor: t.surface,
          borderTopWidth: 1,
          borderColor: t.border,
        }}
      >
        <View>
          <Text style={{ fontFamily: fonts.numericBold, fontSize: 18, color: t.text }}>
            {formatSar(Number(car.daily_price))}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted }}>
            لليوم · شامل الضريبة
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="احجز الآن"
            fullWidth
            onPress={() =>
              session ? router.push(`/cars/${car.id}/book`) : router.push("/auth")
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function TierRow({ label, rate, daily }: { label: string; rate: number; daily: number }) {
  const { t } = useTheme();
  const saving = tierSavingPercent(daily, rate);
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: t.text }}>{label}</Text>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
        <Text style={{ fontFamily: fonts.numericBold, fontSize: 14, color: t.text }}>
          {formatSar(rate)}
          <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted }}> / يوم</Text>
        </Text>
        {saving > 0 ? (
          <View style={{ backgroundColor: t.successTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }}>
            <Text style={{ fontFamily: fonts.numericBold, fontSize: 11, color: t.success }}>
              وفّر {saving}%
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Spec({ label }: { label: string }) {
  const { t } = useTheme();
  return (
    <View style={{ backgroundColor: t.surface2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill }}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: t.textMuted }}>{label}</Text>
    </View>
  );
}
