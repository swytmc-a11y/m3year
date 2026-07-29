import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View, Text, TextInput, FlatList, Switch, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import {
  Button,
  Chip,
  EmptyState,
  FieldLabel,
  IconButton,
  SegmentedControl,
  Sheet,
  Skeleton,
  Tappable,
  useRefreshTint,
  useTabBarSpacing,
  useToast,
} from "@/components/kit";
import { BellIcon, FilterIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { CreateTypeSheet } from "@/components/create-type-sheet";
import { ListingCard, LISTING_CARD_COLUMNS, type ListingCardData } from "@/components/listings";
import { FranchiseCard, FRANCHISE_CARD_COLUMNS, type FranchiseCardData } from "@/components/franchises";
import { supabase } from "@/lib/supabase";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { createSavedSearch } from "@/lib/saved-searches";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { SECTOR_OPTIONS, SECTOR_LABELS, type BusinessSector } from "@/lib/constants";
import { fonts, radius } from "@/theme";

type SortOption = "newest" | "revenue_desc" | "percentage_desc";
type Mode = "listings" | "franchises";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "الأحدث",
  revenue_desc: "الأعلى إيرادًا",
  percentage_desc: "الأعلى نسبة مطروحة",
};

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "listings", label: "فرص استثمارية" },
  { value: "franchises", label: "امتيازات تجارية" },
];

// The feed used to fetch every published row on every filter change. That is
// fine at 50 listings and ruinous at 5,000 — it grows the response linearly
// with the catalogue for every user on every keystroke. Pages of this size
// fill more than a screen, so scrolling stays ahead of the fetch.
const PAGE_SIZE = 12;

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const refreshTint = useRefreshTint();
  const toast = useToast();
  const { session } = useAuth();

  const [mode, setMode] = useState<Mode>("listings");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<BusinessSector | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");
  const [minRevenue, setMinRevenue] = useState("");
  const [maxRevenue, setMaxRevenue] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);

  const [listings, setListings] = useState<ListingCardData[] | null>(null);
  const [franchises, setFranchises] = useState<FranchiseCardData[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Whether the server still has rows past what we've loaded, and whether a
  // next-page fetch is already running (so scroll momentum can't fire several).
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Bumped every time the filter set changes. A response whose token no
  // longer matches belongs to a superseded filter set and is dropped, so a
  // slow early request can't overwrite the results of a newer one.
  const requestToken = useRef(0);

  const fetchPage = useCallback(
    async (page: number) => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const q = search.trim();
      // PostgREST treats , and ) as syntax inside or(), so a raw query string
      // would break the filter (or match unintended rows). Strip them.
      const safeQ = q.replace(/[,()]/g, " ").trim();

      if (mode === "franchises") {
        let query = supabase
          .from("franchises")
          .select(FRANCHISE_CARD_COLUMNS)
          .eq("status", "published");
        if (sector) query = query.eq("sector", sector);
        if (verifiedOnly) query = query.eq("verification_status", "verified");
        if (safeQ) {
          query = query.or(
            `brand_name.ilike.%${safeQ}%,description.ilike.%${safeQ}%,city.ilike.%${safeQ}%`,
          );
        }
        query = query
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to);
        return query;
      }

      let query = supabase
        .from("listings")
        .select(LISTING_CARD_COLUMNS)
        .eq("status", "published");
      if (sector) query = query.eq("sector", sector);
      if (verifiedOnly) query = query.eq("verification_status", "verified");
      if (safeQ) {
        query = query.or(
          `title.ilike.%${safeQ}%,description.ilike.%${safeQ}%,city.ilike.%${safeQ}%`,
        );
      }

      const min = Number(minRevenue);
      if (minRevenue && !Number.isNaN(min)) query = query.gte("monthly_revenue", min);
      const max = Number(maxRevenue);
      if (maxRevenue && !Number.isNaN(max)) query = query.lte("monthly_revenue", max);

      query = query.order("is_featured", { ascending: false });
      if (sort === "revenue_desc") {
        query = query.order("monthly_revenue", { ascending: false });
      } else if (sort === "percentage_desc") {
        query = query.order("offered_percentage", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }
      // id breaks ties so a row can't appear on two pages (or on none) when
      // several share the same sort value — the classic pagination duplicate.
      return query.order("id", { ascending: false }).range(from, to);
    },
    [mode, sector, verifiedOnly, search, sort, minRevenue, maxRevenue],
  );

  const load = useCallback(async () => {
    setError(false);
    const token = ++requestToken.current;

    const { data, error: qError } = await fetchPage(0);
    if (token !== requestToken.current) return;

    if (qError) {
      console.error("[home] load failed", qError);
      setError(true);
      setListings(null);
      setFranchises(null);
      setHasMore(false);
    } else {
      const rows = data ?? [];
      if (mode === "franchises") {
        setFranchises(rows as unknown as FranchiseCardData[]);
        setListings(null);
      } else {
        setListings(rows as unknown as ListingCardData[]);
        setFranchises(null);
      }
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [fetchPage, mode]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading || error) return;
    const current = mode === "franchises" ? franchises : listings;
    if (!current || current.length === 0) return;

    setLoadingMore(true);
    const token = requestToken.current;
    const page = Math.floor(current.length / PAGE_SIZE);
    const { data, error: qError } = await fetchPage(page);

    // Filters changed while this page was in flight — its rows belong to a
    // query the user has already moved on from.
    if (token !== requestToken.current) {
      setLoadingMore(false);
      return;
    }

    if (qError) {
      console.error("[home] load more failed", qError);
      setHasMore(false);
    } else {
      const rows = data ?? [];
      if (mode === "franchises") {
        setFranchises((prev) => [...(prev ?? []), ...(rows as unknown as FranchiseCardData[])]);
      } else {
        setListings((prev) => [...(prev ?? []), ...(rows as unknown as ListingCardData[])]);
      }
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, loading, error, mode, franchises, listings, fetchPage]);

  // Debounce so typing in search/range fields doesn't fire a query per keystroke.
  // Any filter change restarts from page 0, so previously-loaded pages of the
  // old filter set must not be treated as "already have more".
  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      getUnreadNotificationCount()
        .then(setUnreadCount)
        .catch(() => {});
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function resetFilters() {
    setSector(null);
    setVerifiedOnly(false);
    setSort("newest");
    setMinRevenue("");
    setMaxRevenue("");
  }

  // Suggested name, built from the filters themselves so the common case is
  // "tap save, tap confirm" rather than "think of a name".
  const defaultSearchName = useMemo(() => {
    const parts = [mode === "listings" ? "فرص" : "امتيازات"];
    if (sector) parts.push(SECTOR_LABELS[sector]);
    if (verifiedOnly) parts.push("موثّقة");
    return parts.join(" · ");
  }, [mode, sector, verifiedOnly]);

  function onSaveSearch() {
    if (!session) {
      toast("سجّل الدخول لحفظ البحث.", "error");
      return;
    }
    setFiltersOpen(false);
    setSavePromptOpen(true);
  }

  async function onConfirmSaveSearch(name: string) {
    setSavingSearch(true);
    const { error: saveError } = await createSavedSearch({
      name,
      kind: mode === "listings" ? "listing" : "franchise",
      sector,
      minRevenue: minRevenue ? Number(minRevenue) : null,
      maxRevenue: maxRevenue ? Number(maxRevenue) : null,
      verifiedOnly,
    });
    setSavingSearch(false);
    if (saveError) {
      toast(saveError, "error");
      return;
    }
    setSavePromptOpen(false);
    toast("تم حفظ البحث. سنُنبّهك عند تطابق جديد.", "success");
  }

  // Everything the user changed away from its default, so the filter button can
  // show at a glance that a narrowed view is in effect.
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (sector) {
      chips.push({
        key: "sector",
        label: SECTOR_OPTIONS.find((o) => o.value === sector)?.label ?? "",
        clear: () => setSector(null),
      });
    }
    if (verifiedOnly) chips.push({ key: "verified", label: "موثّقة فقط", clear: () => setVerifiedOnly(false) });
    if (mode === "listings" && sort !== "newest") {
      chips.push({ key: "sort", label: SORT_LABELS[sort], clear: () => setSort("newest") });
    }
    if (mode === "listings" && minRevenue) {
      chips.push({ key: "min", label: `إيراد من ${minRevenue}`, clear: () => setMinRevenue("") });
    }
    if (mode === "listings" && maxRevenue) {
      chips.push({ key: "max", label: `إيراد حتى ${maxRevenue}`, clear: () => setMaxRevenue("") });
    }
    return chips;
  }, [sector, verifiedOnly, sort, minRevenue, maxRevenue, mode]);

  const rows: (ListingCardData | FranchiseCardData)[] =
    mode === "listings" ? (listings ?? []) : (franchises ?? []);
  const activeCount = mode === "listings" ? listings?.length : franchises?.length;

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
        <Logo size={20} />
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <IconButton accessibilityLabel="الإشعارات" badge={unreadCount > 0} onPress={() => router.push("/notifications")}>
            <BellIcon color={t.text} size={16} />
          </IconButton>
          <IconButton accessibilityLabel="إضافة إعلان" onPress={() => setCreateOpen(true)} size={40} tone="primary">
            <PlusIcon color={t.onPrimary} size={17} />
          </IconButton>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) =>
          mode === "listings" ? (
            <ListingCard listing={item as ListingCardData} index={index} />
          ) : (
            <FranchiseCard franchise={item as FranchiseCardData} index={index} />
          )
        }
        contentContainerStyle={{ padding: 18, paddingTop: 4, paddingBottom: tabSpacing, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshTint} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator color={t.textMuted} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <HomeHeader
            mode={mode}
            setMode={setMode}
            search={search}
            setSearch={setSearch}
            placeholder={mode === "listings" ? "ابحث بعنوان المشروع" : "ابحث باسم العلامة التجارية"}
            activeCount={activeCount}
            activeFilters={activeFilters}
            onOpenFilters={() => setFiltersOpen(true)}
          />
        }
        ListEmptyComponent={
          loading ? (
            <HomeSkeletonList />
          ) : error ? (
            <EmptyState
              title="تعذّر التحميل"
              description={mode === "listings" ? "تعذّر تحميل المشاريع الآن." : "تعذّر تحميل الامتيازات الآن."}
              action={<Button label="إعادة المحاولة" variant="secondary" onPress={() => load()} />}
            />
          ) : activeFilters.length > 0 || search.trim() ? (
            <EmptyState
              icon={<SearchIcon color={t.textMuted} size={20} />}
              title="لا نتائج مطابقة"
              description="جرّب توسيع البحث أو إزالة بعض الفلاتر."
              action={
                <Button
                  label="مسح الفلاتر"
                  variant="secondary"
                  onPress={() => {
                    resetFilters();
                    setSearch("");
                  }}
                />
              }
            />
          ) : (
            <EmptyState
              title={mode === "listings" ? "لا توجد فرص منشورة بعد" : "لا توجد امتيازات منشورة بعد"}
              description="تظهر هنا الإعلانات فور اعتمادها من فريق معيار."
            />
          )
        }
      />

      <CreateTypeSheet visible={createOpen} onClose={() => setCreateOpen(false)} />

      <FiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        mode={mode}
        sector={sector}
        setSector={setSector}
        sort={sort}
        setSort={setSort}
        verifiedOnly={verifiedOnly}
        setVerifiedOnly={setVerifiedOnly}
        minRevenue={minRevenue}
        setMinRevenue={setMinRevenue}
        maxRevenue={maxRevenue}
        setMaxRevenue={setMaxRevenue}
        onReset={resetFilters}
        onSaveSearch={onSaveSearch}
        resultCount={activeCount}
      />

      <SaveSearchPrompt
        visible={savePromptOpen}
        defaultName={defaultSearchName}
        saving={savingSearch}
        onCancel={() => setSavePromptOpen(false)}
        onConfirm={onConfirmSaveSearch}
      />
    </SafeAreaView>
  );
}

/**
 * Two rows instead of five: the mode switch, then search with the filters
 * folded behind one button. Anything narrowed shows as a removable chip so the
 * current view is still legible without opening the sheet.
 */
function HomeHeader({
  mode,
  setMode,
  search,
  setSearch,
  placeholder,
  activeCount,
  activeFilters,
  onOpenFilters,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  search: string;
  setSearch: (s: string) => void;
  placeholder: string;
  activeCount?: number;
  activeFilters: { key: string; label: string; clear: () => void }[];
  onOpenFilters: () => void;
}) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 10, marginBottom: 4 }}>
      <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 9,
            backgroundColor: t.surface,
            borderRadius: radius.lg,
            paddingHorizontal: 13,
            height: 44,
            ...t.shadowSm,
          }}
        >
          <SearchIcon color={t.textMuted} size={15} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={placeholder}
            placeholderTextColor={t.textMuted}
            returnKeyType="search"
            style={{ flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: t.text, textAlign: "right" }}
          />
        </View>

        <Tappable onPress={onOpenFilters} haptic="light" accessibilityRole="button" accessibilityLabel="الفلاتر">
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.lg,
              backgroundColor: activeFilters.length > 0 ? t.primary : t.surface,
              alignItems: "center",
              justifyContent: "center",
              ...(activeFilters.length > 0 ? t.shadowPrimary : t.shadowSm),
            }}
          >
            <FilterIcon color={activeFilters.length > 0 ? t.onPrimary : t.text} size={17} />
            {activeFilters.length > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  left: -4,
                  minWidth: 17,
                  height: 17,
                  borderRadius: 9,
                  paddingHorizontal: 4,
                  backgroundColor: t.text,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: t.bg,
                }}
              >
                <Text style={{ fontFamily: fonts.numericBold, fontSize: 9, color: t.bg }}>{activeFilters.length}</Text>
              </View>
            ) : null}
          </View>
        </Tappable>
      </View>

      {activeFilters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row-reverse", gap: 7 }}
        >
          {activeFilters.map((f) => (
            <Tappable key={f.key} onPress={f.clear} haptic="light" accessibilityLabel={`إزالة ${f.label}`}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 11,
                  height: 28,
                  borderRadius: radius.pill,
                  backgroundColor: t.surface,
                  borderWidth: 1,
                  borderColor: t.border,
                }}
              >
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: t.text }}>{f.label}</Text>
                <Text style={{ fontSize: 13, lineHeight: 15, color: t.textMuted }}>×</Text>
              </View>
            </Tappable>
          ))}
        </ScrollView>
      ) : null}

      {activeCount != null ? (
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.primary }} />
          <Text style={{ fontFamily: fonts.numeric, fontSize: 10, color: t.textMuted }}>
            {activeCount} {mode === "listings" ? "فرصة نشطة" : "امتياز متاح"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FiltersSheet({
  visible,
  onClose,
  mode,
  sector,
  setSector,
  sort,
  setSort,
  verifiedOnly,
  setVerifiedOnly,
  minRevenue,
  setMinRevenue,
  maxRevenue,
  setMaxRevenue,
  onReset,
  onSaveSearch,
  resultCount,
}: {
  visible: boolean;
  onClose: () => void;
  onSaveSearch: () => void;
  mode: Mode;
  sector: BusinessSector | null;
  setSector: (s: BusinessSector | null) => void;
  sort: SortOption;
  setSort: (s: SortOption) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  minRevenue: string;
  setMinRevenue: (v: string) => void;
  maxRevenue: string;
  setMaxRevenue: (v: string) => void;
  onReset: () => void;
  resultCount?: number;
}) {
  const { t } = useTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="الفلاتر"
      footer={
        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={resultCount != null ? `عرض ${resultCount} نتيجة` : "عرض النتائج"}
              fullWidth
              onPress={onClose}
            />
          </View>
          <Button label="مسح" variant="secondary" onPress={onReset} />
        </View>
      }
    >
      <View style={{ gap: 18 }}>
        <View style={{ gap: 9 }}>
          <FieldLabel>القطاع</FieldLabel>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
            <Chip label="الكل" active={sector === null} onPress={() => setSector(null)} />
            {SECTOR_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={sector === opt.value}
                onPress={() => setSector(opt.value)}
              />
            ))}
          </View>
        </View>

        {mode === "listings" ? (
          <View style={{ gap: 9 }}>
            <FieldLabel>الترتيب</FieldLabel>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                <Chip key={opt} label={SORT_LABELS[opt]} active={sort === opt} onPress={() => setSort(opt)} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2, flex: 1 }}>
            <FieldLabel>الموثّقة فقط</FieldLabel>
            <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted, textAlign: "right" }}>
              أرقامها راجعها محاسب معتمد.
            </Text>
          </View>
          <Switch
            value={verifiedOnly}
            onValueChange={setVerifiedOnly}
            trackColor={{ true: t.success, false: t.border }}
          />
        </View>

        {mode === "listings" ? (
          <View style={{ gap: 9 }}>
            <FieldLabel>نطاق الإيراد الشهري (ر.س)</FieldLabel>
            <View style={{ flexDirection: "row-reverse", gap: 10 }}>
              <RangeInput value={minRevenue} onChangeText={setMinRevenue} placeholder="من" />
              <RangeInput value={maxRevenue} onChangeText={setMaxRevenue} placeholder="إلى" />
            </View>
          </View>
        ) : null}

        {/* Saving lives with the filters rather than in a separate menu: this
            is the moment the user has just expressed what they want. */}
        <View
          style={{ borderTopWidth: 1, borderTopColor: t.border, paddingTop: 16, gap: 8 }}
        >
          <Button label="احفظ هذا البحث ونبّهني" variant="secondary" fullWidth onPress={onSaveSearch} />
          <Text
            style={{ fontFamily: fonts.body, fontSize: 10.5, color: t.textMuted, textAlign: "center", lineHeight: 17 }}
          >
            يصلك إشعار عند نشر فرصة تطابق هذه الفلاتر.
          </Text>
        </View>
      </View>
    </Sheet>
  );
}

function RangeInput({
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
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={t.textMuted}
      style={{
        flex: 1,
        // Without this a TextInput refuses to shrink below its intrinsic width,
        // so the pair overflows the sheet's padding on narrow screens.
        minWidth: 0,
        height: 44,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
        paddingHorizontal: 13,
        fontFamily: fonts.numeric,
        fontSize: 13,
        color: t.text,
        textAlign: "left",
      }}
    />
  );
}

function HomeSkeletonList() {
  return (
    <View style={{ gap: 16 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: 14 }}>
          <Skeleton width="100%" height={140} radius={radius.lg} />
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </View>
      ))}
    </View>
  );
}

/**
 * Names the search being saved. A Sheet rather than a prompt dialog because
 * Android has no native text prompt, and the name is pre-filled from the
 * filters so confirming without typing is the normal path.
 */
function SaveSearchPrompt({
  visible,
  defaultName,
  saving,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  defaultName: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const { t } = useTheme();
  const [name, setName] = useState(defaultName);

  // The suggestion depends on the current filters, so it has to catch up when
  // they change between openings.
  useEffect(() => {
    if (visible) setName(defaultName);
  }, [visible, defaultName]);

  const trimmed = name.trim();

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title="حفظ البحث"
      footer={
        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="حفظ"
              fullWidth
              loading={saving}
              disabled={trimmed.length === 0}
              onPress={() => onConfirm(trimmed)}
            />
          </View>
          <Button label="إلغاء" variant="secondary" onPress={onCancel} />
        </View>
      }
    >
      <View style={{ gap: 9 }}>
        <FieldLabel>اسم البحث</FieldLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="مثال: مقاهي الرياض"
          placeholderTextColor={t.textMuted}
          maxLength={60}
          style={{
            height: 46,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            paddingHorizontal: 14,
            fontFamily: fonts.body,
            fontSize: 13.5,
            color: t.text,
            textAlign: "right",
          }}
        />
      </View>
    </Sheet>
  );
}
