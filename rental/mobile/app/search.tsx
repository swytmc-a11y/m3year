import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams, useSegments } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Chip,
  EmptyState,
  IconButton,
  Sheet,
  Skeleton,
  Tappable,
  useTabBarSpacing,
  useToast,
} from "@/components/kit";
import { ChevronBackIcon, SearchIcon } from "@/components/icons";
import { CarCard, type FeedCar } from "@/components/car-card";
import { useTheme } from "@/contexts/theme";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { listFavoriteIds, toggleFavorite } from "@/lib/favorites";
import {
  searchCars,
  countActiveFilters,
  EMPTY_SEARCH,
  type SearchFilters,
} from "@/lib/search-cars";
import { createSavedSearch } from "@/lib/saved-searches";
import {
  CAR_CATEGORY_OPTIONS,
  TRANSMISSION_OPTIONS,
  FUEL_OPTIONS,
  type CarCategory,
  type TransmissionType,
  type FuelType,
} from "@/lib/constants";
import { countAr, CARS_NOUN } from "@/lib/arabic";
import { fonts, radius } from "@/theme";

const PAGE_SIZE = 12;
const MAX_COMPARE = 3;

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    from?: string;
    to?: string;
    branch?: string;
    category?: string;
    /** A whole saved search, re-opened from the saved-searches screen. */
    filters?: string;
  }>();
  const { t } = useTheme();
  const { session } = useAuth();
  const toast = useToast();

  // This screen is reachable two ways: as the search tab, and pushed onto
  // the stack with dates/filters already chosen (from the home hero, a
  // category rail, or a saved search). The tab instance has no back button
  // to offer and has to leave room for the floating pill; the pushed one is
  // the opposite on both counts.
  const inTabs = useSegments()[0] === "(tabs)";
  const tabSpacing = useTabBarSpacing();
  const bottomClearance = inTabs ? tabSpacing : 0;

  const dates = useMemo(
    () => (params.from && params.to ? { start: params.from, end: params.to } : null),
    [params.from, params.to],
  );

  // A saved search carries filters the individual query params can't express
  // (free text, transmission, fuel, seats, price ceiling), so it arrives as
  // one encoded object. Anything unreadable falls back to an empty search
  // rather than taking the screen down.
  const [filters, setFilters] = useState<SearchFilters>(() => {
    if (params.filters) {
      try {
        return { ...EMPTY_SEARCH, ...(JSON.parse(params.filters) as Partial<SearchFilters>) };
      } catch {
        console.warn("[search] unreadable saved filters");
      }
    }
    return {
      ...EMPTY_SEARCH,
      branchId: params.branch ?? null,
      category: (params.category as CarCategory) ?? null,
    };
  });
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [rows, setRows] = useState<FeedCar[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [compare, setCompare] = useState<string[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; city: string }[]>([]);

  // Typing re-runs the search, so a stale response must never overwrite a
  // newer one — the token is what makes the results match the query the
  // customer can currently see.
  const token = useRef(0);

  const run = useCallback(
    async (nextPage: number, mode: "replace" | "append") => {
      const mine = ++token.current;
      if (mode === "append") setLoadingMore(true);
      try {
        const res = await searchCars({ filters, dates, page: nextPage, pageSize: PAGE_SIZE });
        if (mine !== token.current) return;
        setRows((prev) => (mode === "append" && prev ? [...prev, ...res.rows] : res.rows));
        setTotal(res.total);
        setError(false);
      } catch (err) {
        if (mine !== token.current) return;
        console.error("[search] failed", err);
        setError(true);
      } finally {
        if (mine === token.current) setLoadingMore(false);
      }
    },
    [filters, dates],
  );

  // Debounced: a search per keystroke would fire a request for every letter
  // of "كامري" and show the results of "كا" last.
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(0);
      run(0, "replace");
    }, 220);
    return () => clearTimeout(id);
  }, [run]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name, city")
        .eq("is_active", true)
        .order("name");
      if (active) setBranches(data ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    listFavoriteIds().then((ids) => {
      if (active) setFavorites(new Set(ids));
    });
    return () => {
      active = false;
    };
  }, [session]);

  async function onToggleFavorite(carId: string) {
    if (!session) {
      router.push("/auth");
      return;
    }
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(carId)) next.delete(carId);
      else next.add(carId);
      return next;
    });
    try {
      await toggleFavorite(carId);
    } catch (err) {
      console.error("[search] favourite failed", err);
    }
  }

  function onCompare(carId: string) {
    setCompare((prev) => {
      if (prev.includes(carId)) return prev.filter((id) => id !== carId);
      if (prev.length >= MAX_COMPARE) {
        toast(`يمكن مقارنة ${MAX_COMPARE} سيارات كحد أقصى.`);
        return prev;
      }
      return [...prev, carId];
    });
  }

  async function onSaveSearch() {
    if (!session) {
      router.push("/auth");
      return;
    }
    // Named after what it actually matches, so the saved list reads as a
    // set of searches rather than "بحث ١، بحث ٢".
    const name = describeFilters(filters);
    const res = await createSavedSearch(name, filters);
    toast(res.error ?? `حُفظ البحث: ${name}`, res.error ? "error" : "success");
  }

  const activeCount = countActiveFilters(filters);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        {inTabs ? null : (
          <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
            <ChevronBackIcon color={t.text} />
          </IconButton>
        )}

        <View
          style={{
            flex: 1,
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 8,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.lg,
            paddingHorizontal: 12,
            height: 42,
          }}
        >
          <SearchIcon color={t.textMuted} />
          <TextInput
            value={filters.text}
            onChangeText={(v) => setFilters((f) => ({ ...f, text: v }))}
            placeholder="ابحث بالماركة أو الموديل"
            placeholderTextColor={t.textMuted}
            autoCorrect={false}
            style={{
              flex: 1,
              fontFamily: fonts.body,
              fontSize: 13.5,
              color: t.text,
              textAlign: "right",
            }}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 18, paddingBottom: 10, gap: 10 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <Chip
            label={activeCount > 0 ? `الفلاتر (${activeCount})` : "الفلاتر"}
            active={activeCount > 0}
            onPress={() => {
              setDraft(filters);
              setFiltersOpen(true);
            }}
          />
          <Chip
            label="الأرخص"
            active={filters.sort === "cheapest"}
            onPress={() =>
              setFilters((f) => ({
                ...f,
                sort: f.sort === "cheapest" ? "recommended" : "cheapest",
              }))
            }
          />
          <Chip
            label="الأعلى تقييمًا"
            active={filters.sort === "rating"}
            onPress={() =>
              setFilters((f) => ({ ...f, sort: f.sort === "rating" ? "recommended" : "rating" }))
            }
          />
          {activeCount > 0 || filters.text ? (
            <Chip label="احفظ البحث" active={false} onPress={onSaveSearch} />
          ) : null}
        </View>

        {/* The count is the point of a live search: it changes as the
            customer narrows, so they can feel the effect of each choice. */}
        <Text
          style={{ fontFamily: fonts.numericBold, fontSize: 12, color: t.textMuted, textAlign: "right" }}
        >
          {rows === null ? "جارٍ البحث..." : `${countAr(total, CARS_NOUN)} متاحة`}
          {dates ? " في تواريخك" : ""}
        </Text>
      </View>

      {error ? (
        <EmptyState
          title="تعذّر البحث"
          description="تحقق من اتصالك وحاول مرة أخرى."
          action={<Button label="إعادة المحاولة" onPress={() => run(0, "replace")} />}
        />
      ) : rows === null ? (
        <View style={{ paddingHorizontal: 18, gap: 14 }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} width="100%" height={300} radius={radius.xl} />
          ))}
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          title={dates ? "لا سيارات متاحة في هذه التواريخ" : "لا نتائج مطابقة"}
          description={
            dates
              ? "كل المطابق محجوز في هذه الفترة. جرّب تواريخ أخرى أو وسّع بحثك."
              : "جرّب توسيع الفلاتر أو البحث بكلمة أخرى."
          }
          action={
            activeCount > 0 || filters.text ? (
              <Button
                label="مسح البحث"
                onPress={() => setFilters({ ...EMPTY_SEARCH, sort: filters.sort })}
              />
            ) : undefined
          }
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingBottom: (compare.length > 0 ? 96 : 24) + bottomClearance,
            gap: 14,
          }}
          renderItem={({ item }) => (
            <CarCard
              car={item}
              dates={dates}
              favorited={favorites.has(item.id)}
              onToggleFavorite={onToggleFavorite}
              onCompare={onCompare}
              comparing={compare.includes(item.id)}
            />
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (loadingMore || rows.length >= total) return;
            const next = page + 1;
            setPage(next);
            run(next, "append");
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

      {/* The compare tray only exists once there is something to compare, so
          it never takes space from the results it is about. */}
      {compare.length > 0 ? (
        <View
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 18 + bottomClearance,
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            backgroundColor: t.canvas,
            borderRadius: radius.xl,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.onCanvas }}>
            {countAr(compare.length, CARS_NOUN)} للمقارنة
          </Text>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <Tappable onPress={() => setCompare([])} haptic="light" accessibilityRole="button">
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.onCanvasMuted }}>
                مسح
              </Text>
            </Tappable>
            <Tappable
              onPress={() => {
                if (compare.length < 2) {
                  toast("اختر سيارتين على الأقل للمقارنة.");
                  return;
                }
                router.push(`/compare?ids=${compare.join(",")}` as never);
              }}
              haptic="medium"
              accessibilityRole="button"
            >
              <View
                style={{
                  backgroundColor: t.accent,
                  borderRadius: radius.pill,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 12.5, color: t.onAccent }}>
                  قارن
                </Text>
              </View>
            </Tappable>
          </View>
        </View>
      ) : null}

      <Sheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="الفلاتر"
        footer={
          <View style={{ gap: 10 }}>
            <Button
              label="تطبيق"
              fullWidth
              onPress={() => {
                setFilters(draft);
                setFiltersOpen(false);
              }}
            />
            <Button
              label="مسح الكل"
              variant="secondary"
              fullWidth
              onPress={() => setDraft({ ...EMPTY_SEARCH, text: draft.text, sort: draft.sort })}
            />
          </View>
        }
      >
        <View style={{ gap: 18, paddingBottom: 8 }}>
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

          <FilterGroup label="الوقود">
            {FUEL_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={draft.fuel === o.value}
                onPress={() =>
                  setDraft((d) => ({ ...d, fuel: d.fuel === o.value ? null : (o.value as FuelType) }))
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup label="عدد الركاب">
            {[5, 7].map((n) => (
              <Chip
                key={n}
                label={`${n}+`}
                active={draft.seats === n}
                onPress={() => setDraft((d) => ({ ...d, seats: d.seats === n ? null : n }))}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="أقصى سعر لليوم">
            {[150, 250, 400, 700].map((n) => (
              <Chip
                key={n}
                label={`${n} ر.س`}
                active={draft.maxPrice === n}
                onPress={() => setDraft((d) => ({ ...d, maxPrice: d.maxPrice === n ? null : n }))}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="الفرع">
            {branches.map((b) => (
              <Chip
                key={b.id}
                label={b.name}
                active={draft.branchId === b.id}
                onPress={() =>
                  setDraft((d) => ({ ...d, branchId: d.branchId === b.id ? null : b.id }))
                }
              />
            ))}
          </FilterGroup>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

/** A short human name for a filter set — used when saving a search. */
function describeFilters(f: SearchFilters): string {
  const parts: string[] = [];
  if (f.text.trim()) parts.push(`"${f.text.trim()}"`);
  if (f.category) {
    parts.push(CAR_CATEGORY_OPTIONS.find((o) => o.value === f.category)?.label ?? "");
  }
  if (f.transmission) {
    parts.push(TRANSMISSION_OPTIONS.find((o) => o.value === f.transmission)?.label ?? "");
  }
  if (f.fuel) parts.push(FUEL_OPTIONS.find((o) => o.value === f.fuel)?.label ?? "");
  if (f.seats) parts.push(`${f.seats}+ ركاب`);
  if (f.maxPrice) parts.push(`حتى ${f.maxPrice} ر.س`);
  return parts.filter(Boolean).join(" · ") || "كل السيارات";
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: t.text, textAlign: "right" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>{children}</View>
    </View>
  );
}
