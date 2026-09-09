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
  useRefreshTint,
  useTabBarSpacing,
  useToast,
} from "@/components/kit";
import { BellIcon, SearchIcon } from "@/components/icons";
import { CarCard, type CarCardData } from "@/components/cars";
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
} from "@/lib/constants";
import { fonts, radius } from "@/theme";

type Branch = { id: string; name: string; city: string };

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const refreshTint = useRefreshTint();
  const toast = useToast();

  const [filters, setFilters] = useState<CarFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<CarFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    [filters, cheapest, nearest, coords],
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
          contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: tabSpacing }}
          renderItem={({ item, index }) => (
            <CarCard car={item} index={index} distanceKm={nearest ? item.distance : null} />
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
