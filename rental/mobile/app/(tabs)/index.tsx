import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Logo } from "@/components/logo";
import {
  Button,
  Chip,
  EmptyState,
  IconButton,
  Sheet,
  Skeleton,
  staggerEnter,
  useRefreshTint,
  useTabBarSpacing,
  useToast,
} from "@/components/kit";
import { BellIcon } from "@/components/icons";
import { CarCard, type FeedCar } from "@/components/car-card";
import { Hero, SectionHeader, PromoCard, Rail, type FeedBanner } from "@/components/home-parts";
import { DateRangeCalendar } from "@/components/date-range-calendar";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/theme";
import { useAuth } from "@/contexts/auth";
import { fetchHomeFeed, copyFor, type HomeFeed } from "@/lib/home-feed";
import { listFavoriteIds, toggleFavorite } from "@/lib/favorites";
import { todayIso } from "@/lib/dates";
import { CAR_CATEGORY_OPTIONS, type CarCategory } from "@/lib/constants";
import { countAr, CARS_NOUN } from "@/lib/arabic";
import { fonts, radius } from "@/theme";

type Branch = { id: string; name: string; city: string };

export default function HomeScreen() {
  const router = useRouter();
  const { coupon: couponParam } = useLocalSearchParams<{ coupon?: string }>();
  const { t } = useTheme();
  const { session } = useAuth();
  const tabSpacing = useTabBarSpacing();
  const refreshTint = useRefreshTint();
  const toast = useToast();
  const { width } = useWindowDimensions();

  // Rail cards are a shade narrower than the screen so the next one peeks in
  // — the cheapest possible signal that a rail scrolls.
  const cardWidth = Math.min(268, width * 0.72);
  const promoWidth = width - 36;

  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchOpen, setBranchOpen] = useState(false);

  const [dates, setDates] = useState<{ start: string; end: string } | null>(null);
  const [dateDraft, setDateDraft] = useState<{ start: string; end: string | null }>({
    start: todayIso(),
    end: null,
  });
  const [datesOpen, setDatesOpen] = useState(false);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setFeed(await fetchHomeFeed(dates));
      setError(false);
    } catch (err) {
      console.error("[home] feed failed", err);
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [dates]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name, city")
        .eq("is_active", true)
        .order("name");
      if (active) setBranches((data ?? []) as Branch[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setFavorites(new Set());
      setUnreadCount(0);
      return;
    }
    let active = true;
    (async () => {
      const [ids, { count }] = await Promise.all([
        listFavoriteIds(),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .is("read_at", null),
      ]);
      if (!active) return;
      setFavorites(new Set(ids));
      setUnreadCount(count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  // Announced once per arrival, not on every render, so returning to the tab
  // does not re-toast a code the customer already saw.
  const announcedCoupon = useRef<string | null>(null);
  useEffect(() => {
    if (!couponParam || announcedCoupon.current === couponParam) return;
    announcedCoupon.current = couponParam;
    toast(`رمز الخصم ${couponParam} — أدخله عند تأكيد الحجز.`);
  }, [couponParam, toast]);

  async function onToggleFavorite(carId: string) {
    if (!session) {
      router.push("/auth");
      return;
    }
    // Flipped locally first: waiting on a round trip to fill a heart makes
    // the whole card feel unresponsive.
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(carId)) next.delete(carId);
      else next.add(carId);
      return next;
    });
    try {
      await toggleFavorite(carId);
    } catch (err) {
      console.error("[home] favourite failed", err);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(carId)) next.delete(carId);
        else next.add(carId);
        return next;
      });
    }
  }

  function openSearch(extra?: { category?: CarCategory }) {
    router.push({
      pathname: "/search",
      params: {
        ...(dates ? { from: dates.start, to: dates.end } : {}),
        ...(branchId ? { branch: branchId } : {}),
        ...(extra?.category ? { category: extra.category } : {}),
      },
    } as never);
  }

  function onBannerPress(b: FeedBanner) {
    switch (b.target_kind) {
      case "car":
        if (b.target_car_id) router.push(`/cars/${b.target_car_id}` as never);
        return;
      case "branch":
        router.push("/branches");
        return;
      case "category":
        if (b.target_category) openSearch({ category: b.target_category as CarCategory });
        return;
      case "coupon":
        if (b.target_coupon_code) {
          toast(`رمز الخصم ${b.target_coupon_code} — أدخله عند تأكيد الحجز.`);
        }
        return;
      case "url":
        if (b.target_url) Linking.openURL(b.target_url);
        return;
      default:
    }
  }

  const hero = copyFor(feed, "home.hero", {
    title: "اختر سيارتك. وانطلق على راحتك.",
    subtitle: "خيارات أكثر، حجز أسهل، ورحلة تستحقها.",
  });
  const branchName = branches.find((b) => b.id === branchId)?.name ?? null;

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
        <Logo />
        <IconButton accessibilityLabel="الإشعارات" onPress={() => router.push("/notifications")}>
          <BellIcon color={t.text} />
          {unreadCount > 0 ? (
            <View
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: t.accent,
              }}
            />
          ) : null}
        </IconButton>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: tabSpacing, gap: 26 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            {...refreshTint}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
          <Hero
            title={hero.title}
            subtitle={hero.subtitle ?? ""}
            branchName={branchName}
            dates={dates}
            onPickBranch={() => setBranchOpen(true)}
            onPickDates={() => {
              setDateDraft(dates ?? { start: todayIso(), end: null });
              setDatesOpen(true);
            }}
            onSearch={() => openSearch()}
          />
        </View>

        {/* Category shortcuts. The one filter worth reaching without opening
            anything — how people actually start looking for a rental car. */}
        <View style={{ gap: 12 }}>
          <View style={{ paddingHorizontal: 18 }}>
            <SectionHeader title="لكل رحلة، سيارة" subtitle="اختر ما يناسبك" />
          </View>
          <Rail gap={8}>
            {CAR_CATEGORY_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={false}
                onPress={() => openSearch({ category: o.value as CarCategory })}
              />
            ))}
          </Rail>
        </View>

        {error ? (
          <EmptyState
            title="تعذّر تحميل الصفحة"
            description="تحقق من اتصالك وحاول مرة أخرى."
            action={<Button label="إعادة المحاولة" onPress={load} />}
          />
        ) : !feed ? (
          <View style={{ paddingHorizontal: 18, gap: 14 }}>
            <Skeleton width="45%" height={20} />
            <View style={{ flexDirection: "row-reverse", gap: 12 }}>
              <Skeleton width={cardWidth} height={300} radius={radius.xl} />
              <Skeleton width={cardWidth} height={300} radius={radius.xl} />
            </View>
          </View>
        ) : (
          <>
            <Section
              index={0}
              copy={copyFor(feed, "home.picks", {
                title: "اختيارات تستاهل المشوار",
                subtitle: "سيارات مختارة لرحلتك القادمة",
              })}
              cars={feed.sections?.picks ?? []}
              cardWidth={cardWidth}
              dates={dates}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onSeeAll={() => openSearch()}
            />

            <Section
              index={1}
              copy={copyFor(feed, "home.popular", {
                title: "الأكثر حجزًا",
                subtitle: "ما يختاره عملاؤنا أكثر من غيره",
              })}
              cars={feed.sections?.popular ?? []}
              cardWidth={cardWidth}
              dates={dates}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onSeeAll={() => openSearch()}
            />

            {(feed.banners?.length ?? 0) > 0 ? (
              <Animated.View entering={staggerEnter(2)} style={{ gap: 12 }}>
                <View style={{ paddingHorizontal: 18 }}>
                  <SectionHeader
                    {...copyFor(feed, "home.offers", {
                      title: "مساحة أكبر للتوفير",
                      subtitle: "عروض تنتهي، وفرص تستحق",
                    })}
                  />
                </View>
                <Rail>
                  {(feed.banners ?? []).map((b) => (
                    <PromoCard
                      key={b.id}
                      banner={b}
                      width={promoWidth}
                      onPress={() => onBannerPress(b)}
                    />
                  ))}
                </Rail>
              </Animated.View>
            ) : null}

            <Section
              index={3}
              copy={copyFor(feed, "home.economy", {
                title: "اقتصادية وتكفي",
                subtitle: "أقل سعر لليوم، بلا مفاجآت",
              })}
              cars={feed.sections?.economy ?? []}
              cardWidth={cardWidth}
              dates={dates}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onSeeAll={() => openSearch({ category: "economy" })}
            />

            <View style={{ paddingHorizontal: 18 }}>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 11.5,
                  color: t.textMuted,
                  textAlign: "center",
                }}
              >
                {countAr(feed.total_available ?? 0, CARS_NOUN)} متاحة
                {dates ? " في التواريخ المختارة" : ""} · كل الأسعار شاملة الضريبة
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <Sheet visible={branchOpen} onClose={() => setBranchOpen(false)} title="موقع الاستلام">
        <View style={{ gap: 8, paddingBottom: 8 }}>
          <BranchRow
            label="كل الفروع"
            active={branchId === null}
            onPress={() => {
              setBranchId(null);
              setBranchOpen(false);
            }}
          />
          {branches.map((b) => (
            <BranchRow
              key={b.id}
              label={`${b.name} — ${b.city}`}
              active={branchId === b.id}
              onPress={() => {
                setBranchId(b.id);
                setBranchOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>

      <Sheet
        visible={datesOpen}
        onClose={() => setDatesOpen(false)}
        title="متى تحتاج السيارة؟"
        footer={
          <View style={{ gap: 10 }}>
            <Button
              label={dateDraft.end ? "تأكيد التواريخ" : "اختر تاريخ التسليم"}
              disabled={!dateDraft.end}
              fullWidth
              onPress={() => {
                if (!dateDraft.end) return;
                setDates({ start: dateDraft.start, end: dateDraft.end });
                setDatesOpen(false);
              }}
            />
            {dates ? (
              <Button
                label="بلا تواريخ محددة"
                variant="secondary"
                fullWidth
                onPress={() => {
                  setDates(null);
                  setDatesOpen(false);
                }}
              />
            ) : null}
          </View>
        }
      >
        <DateRangeCalendar range={dateDraft} onChange={setDateDraft} unavailable={[]} />
      </Sheet>
    </SafeAreaView>
  );
}

function Section({
  index,
  copy,
  cars,
  cardWidth,
  dates,
  favorites,
  onToggleFavorite,
  onSeeAll,
}: {
  index: number;
  copy: { title: string; subtitle: string | null };
  cars: FeedCar[];
  cardWidth: number;
  dates: { start: string; end: string } | null;
  favorites: Set<string>;
  onToggleFavorite: (carId: string) => void;
  onSeeAll: () => void;
}) {
  // A rail with nothing in it is a heading followed by a gap — worse than
  // no section at all.
  if (cars.length === 0) return null;

  return (
    <Animated.View entering={staggerEnter(index)} style={{ gap: 12 }}>
      <View style={{ paddingHorizontal: 18 }}>
        <SectionHeader
          title={copy.title}
          subtitle={copy.subtitle}
          actionLabel="عرض الكل"
          onAction={onSeeAll}
        />
      </View>
      <Rail>
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            width={cardWidth}
            dates={dates}
            favorited={favorites.has(car.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </Rail>
    </Animated.View>
  );
}

function BranchRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      label={label}
      variant={active ? "primary" : "secondary"}
      fullWidth
      onPress={onPress}
    />
  );
}
