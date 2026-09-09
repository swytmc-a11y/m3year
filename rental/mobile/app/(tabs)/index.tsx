import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import {
  Button,
  Chip,
  EmptyState,
  FieldLabel,
  IconButton,
  Sheet,
  Skeleton,
  Tappable,
  useRefreshTint,
  useTabBarSpacing,
  useToast,
} from "@/components/kit";
import { BellIcon, SearchIcon } from "@/components/icons";
import { CarCard, type CarCardData } from "@/components/cars";
import { DateRangeCalendar } from "@/components/date-range-calendar";
import { PromoBanners } from "@/components/promo-banners";
import { fetchBanners, type Banner } from "@/lib/banners";
import { todayIso, daysBetween } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/theme";
import {
  fetchCars,
  requestCoords,
  EMPTY_FILTERS,
  type CarFilters,
  type Coords,
  type DateRange,
} from "@/lib/cars-data";
import {
  CAR_CATEGORY_OPTIONS,
  TRANSMISSION_OPTIONS,
  FUEL_OPTIONS,
  type CarCategory,
  type TransmissionType,
  type FuelType,
  formatDateShort,
} from "@/lib/constants";
import { fonts, radius } from "@/theme";

type Branch = { id: string; name: string; city: string };

export default function HomeScreen() {
  const router = useRouter();
  // A banner can land here already filtered to a category, or carrying a
  // coupon code to show off.
  const { category: categoryParam, coupon: couponParam } = useLocalSearchParams<{
    category?: string;
    coupon?: string;
  }>();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const refreshTint = useRefreshTint();
  const toast = useToast();

  const [filters, setFilters] = useState<CarFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<CarFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The committed range drives the feed; the draft is what the calendar is
  // editing, so closing the sheet without a complete range changes nothing.
  const [dates, setDates] = useState<DateRange>(null);
  const [dateDraft, setDateDraft] = useState<{ start: string; end: string | null }>({
    start: todayIso(),
    end: null,
  });
  const [datesOpen, setDatesOpen] = useState(false);

  // The two quick chips sit beside the filter button and may both be on.
  const [cheapest, setCheapest] = useState(false);
  const [nearest, setNearest] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  const [cars, setCars] = useState<(CarCardData & { distance: number | null })[] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);

  // Bumped whenever the query changes. A response carrying a stale token
  // belongs to a superseded query and is dropped, so a slow early request
  // cannot overwrite the results of a newer one.
  const requestToken = useRef(0);

  const load = useCallback(
    async (page: number, mode: "replace" | "append") => {
      const token = ++requestToken.current;
      if (mode === "append") setLoadingMore(true);

      try {
        const { rows, hasMore: more } = await fetchCars({
          page,
          filters,
          cheapest,
          nearest,
          coords,
          dates,
        });
        if (token !== requestToken.current) return;
        setCars((prev) => (mode === "append" && prev ? [...prev, ...rows] : rows));
        setHasMore(more);
        setError(false);
      } catch (err) {
        if (token !== requestToken.current) return;
        // Logged, not shown: the raw Postgres/PostgREST message is the only
        // way to tell a dropped connection from an RLS denial, and it belongs
        // in the error reporter rather than in front of a customer.
        console.error("[cars] load failed", err);
        setError(true);
      } finally {
        if (token === requestToken.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [filters, cheapest, nearest, coords, dates],
  );

  useEffect(() => {
    setLoading(true);
    load(0, "replace");
  }, [load]);

  // Applied once, when arriving from a banner, rather than on every render —
  // otherwise clearing the filter by hand would immediately undo itself.
  const appliedCategoryParam = useRef<string | null>(null);
  useEffect(() => {
    if (!categoryParam || appliedCategoryParam.current === categoryParam) return;
    if (!CAR_CATEGORY_OPTIONS.some((o) => o.value === categoryParam)) return;
    appliedCategoryParam.current = categoryParam;
    setFilters((f) => ({ ...f, category: categoryParam as CarCategory }));
  }, [categoryParam]);

  const announcedCoupon = useRef<string | null>(null);
  useEffect(() => {
    if (!couponParam || announcedCoupon.current === couponParam) return;
    announcedCoupon.current = couponParam;
    toast(`رمز الخصم ${couponParam} — أدخله عند تأكيد الحجز.`);
  }, [couponParam, toast]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: branchRows }, { data: session }] = await Promise.all([
        supabase.from("branches").select("id, name, city").eq("is_active", true).order("name"),
        supabase.auth.getSession(),
      ]);
      if (!active) return;
      setBranches((branchRows ?? []) as Branch[]);

      // A failed banner fetch leaves the strip empty rather than breaking
      // the feed — merchandising is never worth a blank screen.
      try {
        const rows = await fetchBanners();
        if (active) setBanners(rows);
      } catch (err) {
        console.error("[banners] load failed", err);
      }

      if (session.session) {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .is("read_at", null);
        if (active) setUnreadCount(count ?? 0);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onToggleNearest() {
    if (nearest) {
      setNearest(false);
      return;
    }
    if (coords) {
      setNearest(true);
      return;
    }
    setLocating(true);
    const next = await requestCoords();
    setLocating(false);
    if (!next) {
      // A chip that silently does nothing is worse than one that explains
      // itself, so say why and leave it off.
      toast("لتفعيل «الأقرب لي» نحتاج إذن الموقع من إعدادات جهازك.", "error");
      return;
    }
    setCoords(next);
    setNearest(true);
  }

  const activeFilterCount = countActive(filters);

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
                minWidth: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: t.primary,
              }}
            />
          ) : null}
        </IconButton>
      </View>

      <View style={{ paddingHorizontal: 18, gap: 12 }}>
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.lg,
            paddingHorizontal: 14,
            height: 46,
          }}
        >
          <SearchIcon color={t.textMuted} />
          <TextInput
            value={filters.search}
            onChangeText={(v) => setFilters((f) => ({ ...f, search: v }))}
            placeholder="ابحث بالماركة أو الموديل"
            placeholderTextColor={t.textMuted}
            style={{
              flex: 1,
              fontFamily: fonts.body,
              fontSize: 13.5,
              color: t.text,
              textAlign: "right",
            }}
          />
        </View>

        {/* Dates come before every other control on purpose: a rental is a
            question of "when", and answering it first removes cars the
            customer could never have had. */}
        <Tappable
          onPress={() => {
            setDateDraft(dates ?? { start: todayIso(), end: null });
            setDatesOpen(true);
          }}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel="اختيار تواريخ الاستئجار"
        >
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              backgroundColor: dates ? `${t.primary}14` : t.surface,
              borderWidth: 1,
              borderColor: dates ? t.primary : t.border,
              borderRadius: radius.lg,
              paddingHorizontal: 14,
              height: 46,
            }}
          >
            <Text
              style={{
                fontFamily: dates ? fonts.bodyMedium : fonts.body,
                fontSize: 13.5,
                color: dates ? t.text : t.textMuted,
              }}
            >
              {dates
                ? `${formatDateShort(dates.start)} — ${formatDateShort(dates.end)}`
                : "متى تحتاج السيارة؟"}
            </Text>

            {dates ? (
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                <Text style={{ fontFamily: fonts.numericBold, fontSize: 12, color: t.primary }}>
                  {daysBetween(dates.start, dates.end)} أيام
                </Text>
                <Tappable
                  onPress={() => setDates(null)}
                  haptic="light"
                  accessibilityRole="button"
                  accessibilityLabel="مسح التواريخ"
                >
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: t.textMuted }}>
                    ×
                  </Text>
                </Tappable>
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>
                اختر التواريخ
              </Text>
            )}
          </View>
        </Tappable>

        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <Chip
            label={activeFilterCount > 0 ? `الفلاتر (${activeFilterCount})` : "الفلاتر"}
            active={activeFilterCount > 0}
            onPress={() => {
              setDraft(filters);
              setFiltersOpen(true);
            }}
          />
          <Chip label="الأرخص" active={cheapest} onPress={() => setCheapest((v) => !v)} />
          <Chip
            label={locating ? "جارٍ تحديد موقعك..." : "الأقرب لي"}
            active={nearest}
            onPress={onToggleNearest}
          />
        </View>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={260} radius={radius.xl} />
          ))}
        </ScrollView>
      ) : error ? (
        <EmptyState
          title="تعذّر تحميل السيارات"
          description="تحقق من اتصالك وحاول مرة أخرى."
          action={<Button label="إعادة المحاولة" onPress={() => load(0, "replace")} />}
        />
      ) : (cars ?? []).length === 0 ? (
        <EmptyState
          title="لا توجد سيارات مطابقة"
          description="جرّب توسيع الفلاتر أو البحث بكلمة أخرى."
          action={
            activeFilterCount > 0 ? (
              <Button label="مسح الفلاتر" onPress={() => setFilters(EMPTY_FILTERS)} />
            ) : undefined
          }
        />
      ) : (
        <FlatList
          data={cars ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 18, gap: 16, paddingBottom: tabSpacing }}
          // Banners scroll away with the feed rather than pinning above it:
          // they are an offer, not a permanent fixture of the screen. The
          // horizontal padding moves onto the rows so the strip can run
          // edge to edge.
          ListHeaderComponent={
            banners.length > 0 ? (
              <View style={{ marginBottom: 2 }}>
                <PromoBanners banners={banners} />
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <View style={{ paddingHorizontal: 18 }}>
              <CarCard
                car={item}
                index={index}
                distanceKm={nearest ? item.distance : null}
                dates={dates}
              />
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              {...refreshTint}
              onRefresh={() => {
                setRefreshing(true);
                load(0, "replace");
              }}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!hasMore || loadingMore || !cars) return;
            load(Math.floor(cars.length / 12), "append");
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color={t.primary} />
              </View>
            ) : null
          }
        />
      )}

      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="الفلاتر">
        <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 12 }}>
          <FilterGroup label="الفئة">
            {CAR_CATEGORY_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={draft.category === o.value}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    category: d.category === o.value ? null : (o.value as CarCategory),
                  }))
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup label="ناقل الحركة">
            {TRANSMISSION_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={draft.transmission === o.value}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    transmission:
                      d.transmission === o.value ? null : (o.value as TransmissionType),
                  }))
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup label="نوع الوقود">
            {FUEL_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={draft.fuel === o.value}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    fuel: d.fuel === o.value ? null : (o.value as FuelType),
                  }))
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup label="عدد المقاعد (على الأقل)">
            {[2, 5, 7, 12].map((n) => (
              <Chip
                key={n}
                label={`${n}+`}
                active={draft.seats === n}
                onPress={() => setDraft((d) => ({ ...d, seats: d.seats === n ? null : n }))}
              />
            ))}
          </FilterGroup>

          {branches.length > 0 ? (
            <FilterGroup label="الفرع">
              {branches.map((b) => (
                <Chip
                  key={b.id}
                  label={`${b.name} — ${b.city}`}
                  active={draft.branchId === b.id}
                  onPress={() =>
                    setDraft((d) => ({ ...d, branchId: d.branchId === b.id ? null : b.id }))
                  }
                />
              ))}
            </FilterGroup>
          ) : null}

          <View style={{ gap: 8 }}>
            <FieldLabel>السعر اليومي (ر.س)</FieldLabel>
            <View style={{ flexDirection: "row-reverse", gap: 10 }}>
              <PriceInput
                value={draft.minPrice}
                onChangeText={(v) => setDraft((d) => ({ ...d, minPrice: v }))}
                placeholder="من"
              />
              <PriceInput
                value={draft.maxPrice}
                onChangeText={(v) => setDraft((d) => ({ ...d, maxPrice: v }))}
                placeholder="إلى"
              />
            </View>
          </View>

          <View style={{ flexDirection: "row-reverse", gap: 10 }}>
            <Button
              label="تطبيق"
              fullWidth
              onPress={() => {
                setFilters(draft);
                setFiltersOpen(false);
              }}
            />
            <Button
              label="مسح"
              variant="secondary"
              onPress={() => setDraft({ ...EMPTY_FILTERS, search: draft.search })}
            />
          </View>
        </ScrollView>
      </Sheet>

      <Sheet
        visible={datesOpen}
        onClose={() => setDatesOpen(false)}
        title="متى تحتاج السيارة؟"
        footer={
          <View style={{ gap: 10 }}>
            <Button
              label={
                dateDraft.end
                  ? `عرض المتاح · ${daysBetween(dateDraft.start, dateDraft.end)} أيام`
                  : "اختر تاريخ التسليم"
              }
              // Without an end date there is no range to search, so the
              // action stays disabled rather than committing half a choice.
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
                label="عرض كل السيارات"
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
        <View style={{ paddingBottom: 8 }}>
          <DateRangeCalendar
            range={dateDraft}
            onChange={setDateDraft}
            unavailable={[]}
          />
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 11.5,
              color: t.textMuted,
              textAlign: "center",
              lineHeight: 19,
              marginTop: 10,
            }}
          >
            نعرض لك السيارات المتاحة فعليًا في هذه المدة فقط.
          </Text>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <FieldLabel>{label}</FieldLabel>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>{children}</View>
    </View>
  );
}

function PriceInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const { t } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={t.textMuted}
      keyboardType="number-pad"
      style={{
        flex: 1,
        height: 46,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.lg,
        backgroundColor: t.surface,
        paddingHorizontal: 14,
        fontFamily: fonts.numeric,
        fontSize: 13.5,
        color: t.text,
        textAlign: "left",
      }}
    />
  );
}

function countActive(f: CarFilters): number {
  let n = 0;
  if (f.category) n++;
  if (f.transmission) n++;
  if (f.fuel) n++;
  if (f.branchId) n++;
  if (f.seats) n++;
  if (f.minPrice) n++;
  if (f.maxPrice) n++;
  return n;
}
