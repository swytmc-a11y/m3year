import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
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
import { DateRangeCalendar, type DayRange } from "@/components/date-range-calendar";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/theme";
import {
  fetchCars,
  requestCoords,
  EMPTY_FILTERS,
  type CarFilters,
  type Coords,
} from "@/lib/cars-data";
import {
  CAR_CATEGORY_OPTIONS,
  TRANSMISSION_OPTIONS,
  FUEL_OPTIONS,
  type CarCategory,
  type TransmissionType,
  type FuelType,
  formatDate,
} from "@/lib/constants";
import { fonts, radius } from "@/theme";
import { addDays, todayIso } from "@/lib/dates";

type Branch = { id: string; name: string; city: string };

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const refreshTint = useRefreshTint();
  const toast = useToast();
  const { width } = useWindowDimensions();

  const [filters, setFilters] = useState<CarFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<CarFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [range, setRange] = useState<DayRange>(() => ({
    start: addDays(todayIso(), 1),
    end: addDays(todayIso(), 4),
  }));
  const [draftRange, setDraftRange] = useState<DayRange>(range);
  const [appliedRange, setAppliedRange] = useState<DayRange>(range);

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
          startDate: appliedRange.start,
          endDate: appliedRange.end,
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
    [filters, cheapest, nearest, coords, appliedRange],
  );

  useEffect(() => {
    setLoading(true);
    load(0, "replace");
  }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: branchRows }, { data: session }] = await Promise.all([
        supabase.from("branches").select("id, name, city").eq("is_active", true).order("name"),
        supabase.auth.getSession(),
      ]);
      if (!active) return;
      setBranches((branchRows ?? []) as Branch[]);

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
  const columns = width >= 1100 ? 3 : width >= 700 ? 2 : 1;
  const contentPadding = width >= 700 ? 28 : 18;
  const cardWidth = (Math.min(width, 1260) - contentPadding * 2 - 18 * (columns - 1)) / columns;
  const selectedBranch = branches.find((branch) => branch.id === filters.branchId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <FlatList
        key={`cars-${columns}`}
        data={!loading && !error ? (cars ?? []) : []}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        style={{ width: "100%", maxWidth: 1260, alignSelf: "center" }}
        contentContainerStyle={{ paddingHorizontal: contentPadding, gap: 18, paddingBottom: tabSpacing }}
        columnWrapperStyle={columns > 1 ? { gap: 18 } : undefined}
        ListHeaderComponent={
      <View>
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: width >= 700 ? 16 : 10,
          }}
        >
          <Logo size={width >= 700 ? 35 : 29} />
          <IconButton accessibilityLabel="الإشعارات" badge={unreadCount > 0} onPress={() => router.push("/notifications")}>
            <BellIcon color={t.text} />
          </IconButton>
        </View>

        <View
          style={{
            minHeight: width >= 700 ? 238 : 250,
            backgroundColor: "#142C2D",
            borderRadius: width >= 700 ? 24 : 20,
            paddingHorizontal: width >= 700 ? 36 : 22,
            paddingTop: width >= 700 ? 30 : 24,
            paddingBottom: 58,
            overflow: "hidden",
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: "#D5F46B", textAlign: "right" }}>
            خيارات أكثر، وطريق أوضح
          </Text>
          <Text
            style={{
              maxWidth: 600,
              fontFamily: fonts.displayBold,
              fontSize: width >= 700 ? 36 : 27,
              lineHeight: width >= 700 ? 53 : 42,
              color: "#FFFFFF",
              textAlign: "right",
              marginTop: 5,
            }}
          >
            رحلتك تبدأ من <Text style={{ color: "#D5F46B" }}>اختيارك</Text>
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: "#C1CFCA", textAlign: "right", marginTop: 5 }}>
            قارن السيارات المتاحة واحجزها مباشرة من أقرب فرع.
          </Text>
          {width >= 700 ? (
            <Text
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 26,
                top: -18,
                fontFamily: fonts.displayBold,
                fontSize: 150,
                color: "#244041",
                transform: [{ rotate: "-7deg" }],
              }}
            >
              سمو
            </Text>
          ) : null}
        </View>

        <View
          style={{
            marginHorizontal: width >= 700 ? 22 : 12,
            marginTop: -34,
            padding: 12,
            borderRadius: 15,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            ...t.shadowMd,
            gap: 10,
          }}
        >
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
            حدّد تفاصيل رحلتك
          </Text>
          <View style={{ flexDirection: width >= 700 ? "row-reverse" : "column", gap: 10 }}>
            <Tappable
              onPress={() => { setDraft(filters); setDraftRange(range); setBookingOpen(true); }}
              accessibilityRole="button"
              accessibilityLabel="اختيار فرع الاستلام"
              style={{ flex: 1.2 }}
            >
              <View
                style={{
                  minHeight: 48,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: radius.lg,
                  paddingHorizontal: 14,
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.body, fontSize: 10.5, color: t.textMuted, textAlign: "right" }}>فرع الاستلام</Text>
                <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: t.text, textAlign: "right", marginTop: 1 }}>
                  {selectedBranch ? `${selectedBranch.name} — ${selectedBranch.city}` : "جميع الفروع"}
                </Text>
              </View>
            </Tappable>
            <View style={{ flex: 2, flexDirection: "row-reverse", gap: 10 }}>
              <BookingField
                label="تاريخ الاستلام"
                value={formatDate(range.start)}
                onPress={() => { setDraft(filters); setDraftRange(range); setBookingOpen(true); }}
              />
              <BookingField
                label="تاريخ التسليم"
                value={range.end ? formatDate(range.end) : "حدّد التاريخ"}
                onPress={() => { setDraft(filters); setDraftRange(range); setBookingOpen(true); }}
              />
            </View>
          </View>
          <View style={{ flexDirection: width >= 700 ? "row-reverse" : "column", gap: 10 }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 10,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: radius.lg,
                paddingHorizontal: 14,
                minHeight: 48,
              }}
            >
              <SearchIcon color={t.textMuted} />
              <TextInput
                value={filters.search}
                onChangeText={(value) => setFilters((current) => ({ ...current, search: value }))}
                placeholder="بحث اختياري بالماركة أو الموديل"
                placeholderTextColor={t.textMuted}
                accessibilityLabel="البحث عن سيارة"
                style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: t.text, textAlign: "right" }}
              />
            </View>
            <View style={{ minWidth: width >= 700 ? 190 : undefined }}>
              <Button
                label="عرض السيارات المتاحة"
                fullWidth
                onPress={() => setAppliedRange({ ...range })}
              />
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 18 }}>
          <Chip
            label={activeFilterCount > 0 ? `الفلاتر (${activeFilterCount})` : "كل الفلاتر"}
            active={activeFilterCount > 0}
            onPress={() => { setDraft(filters); setFiltersOpen(true); }}
          />
          <Chip label="كل السيارات" active={!filters.category} onPress={() => setFilters((current) => ({ ...current, category: null }))} />
          {CAR_CATEGORY_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={filters.category === option.value}
              onPress={() => setFilters((current) => ({ ...current, category: current.category === option.value ? null : option.value }))}
            />
          ))}
          <Chip label="الأرخص" active={cheapest} onPress={() => setCheapest((value) => !value)} />
          <Chip label={locating ? "جارٍ تحديد الموقع..." : "الأقرب لي"} active={nearest} onPress={onToggleNearest} />
        </ScrollView>

        <View style={{ flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 12 }}>
          <View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: width >= 700 ? 23 : 19, color: t.text, textAlign: "right" }}>
              سيارات تناسب وجهتك
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", marginTop: 3 }}>
              الأسعار المعروضة شاملة ضريبة القيمة المضافة
            </Text>
          </View>
        </View>
        {loading ? (
        <View style={{ gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={260} radius={radius.xl} />
          ))}
        </View>
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
      ) : null}
      </View>
        }
        renderItem={({ item, index }) => (
          <View style={{ flex: 1, maxWidth: cardWidth }}>
            <CarCard car={item} index={index} distanceKm={nearest ? item.distance : null} />
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

      <Sheet visible={bookingOpen} onClose={() => setBookingOpen(false)} title="تفاصيل الرحلة">
        <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 12 }}>
          <View style={{ gap: 10 }}>
            <FieldLabel>فرع الاستلام</FieldLabel>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
              <Chip
                label="جميع الفروع"
                active={!draft.branchId}
                onPress={() => setDraft((current) => ({ ...current, branchId: null }))}
              />
              {branches.map((branch) => (
                <Chip
                  key={branch.id}
                  label={`${branch.name} — ${branch.city}`}
                  active={draft.branchId === branch.id}
                  onPress={() => setDraft((current) => ({ ...current, branchId: branch.id }))}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <FieldLabel>تاريخ الاستلام والتسليم</FieldLabel>
            <DateRangeCalendar range={draftRange} onChange={setDraftRange} minDate={todayIso()} />
          </View>

          <Button
            label="عرض السيارات المتاحة"
            fullWidth
            disabled={!draftRange.end || draftRange.end <= draftRange.start}
            onPress={() => {
              if (!draftRange.end || draftRange.end <= draftRange.start) return;
              setRange(draftRange);
              setAppliedRange(draftRange);
              setFilters((current) => ({ ...current, branchId: draft.branchId }));
              setBookingOpen(false);
            }}
          />
        </ScrollView>
      </Sheet>

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

function BookingField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={{ flex: 1 }}>
      <View
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: radius.lg,
          paddingHorizontal: 12,
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.body, fontSize: 10.5, color: t.textMuted, textAlign: "right" }}>{label}</Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: t.text, textAlign: "right", marginTop: 1 }}>
          {value}
        </Text>
      </View>
    </Tappable>
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
