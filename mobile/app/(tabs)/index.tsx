import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Switch,
  ScrollView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Chip, IconButton, SegmentedControl, Skeleton, Tappable } from "@/components/kit";
import { BellIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { ListingCard } from "@/components/listings";
import { FranchiseCard } from "@/components/franchises";
import { supabase } from "@/lib/supabase";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { useTheme } from "@/contexts/theme";
import {
  SECTOR_OPTIONS,
  type Listing,
  type BusinessSector,
} from "@/lib/constants";
import type { Franchise } from "@/lib/franchise-constants";
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

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [mode, setMode] = useState<Mode>("listings");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<BusinessSector | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minRevenue, setMinRevenue] = useState("");
  const [maxRevenue, setMaxRevenue] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const [listings, setListings] = useState<Listing[] | null>(null);
  const [franchises, setFranchises] = useState<Franchise[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    if (mode === "franchises") {
      let fquery = supabase.from("franchises").select("*").eq("status", "published");
      if (sector) fquery = fquery.eq("sector", sector);
      if (verifiedOnly) fquery = fquery.eq("verification_status", "verified");
      const q = search.trim();
      if (q) fquery = fquery.ilike("brand_name", `%${q}%`);
      fquery = fquery
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      const { data, error: qError } = await fquery;
      if (qError) {
        console.error("[home] franchises load failed", qError);
        setError(true);
        setFranchises(null);
      } else {
        setFranchises(data);
      }
      setLoading(false);
      return;
    }

    let query = supabase
      .from("listings")
      .select("*")
      .eq("status", "published");

    if (sector) query = query.eq("sector", sector);
    if (verifiedOnly) query = query.eq("verification_status", "verified");
    const q = search.trim();
    if (q) query = query.ilike("title", `%${q}%`);

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

    const { data, error: qError } = await query;
    if (qError) {
      console.error("[home] load failed", qError);
      setError(true);
      setListings(null);
    } else {
      setListings(data);
    }
    setLoading(false);
  }, [mode, sector, verifiedOnly, search, sort, minRevenue, maxRevenue]);

  // Debounce so typing in search/range fields doesn't fire a query per keystroke.
  useEffect(() => {
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

  const activeCount = mode === "listings" ? listings?.length : franchises?.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 10 }}>
        <Logo size={20} />
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <IconButton
            accessibilityLabel="الإشعارات"
            badge={unreadCount > 0}
            onPress={() => router.push("/notifications")}
          >
            <BellIcon color={t.text} size={16} />
          </IconButton>
          <IconButton
            accessibilityLabel={mode === "listings" ? "إعلان جديد" : "امتياز جديد"}
            onPress={() => router.push(mode === "listings" ? "/my-listings/new" : "/my-franchises/new")}
            size={40}
            tone="primary"
          >
            <PlusIcon color={t.onPrimary} size={17} />
          </IconButton>
        </View>
      </View>

      {mode === "listings" ? (
        <FlatList
          data={listings ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <ListingCard listing={item} index={index} />}
          contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 16 }}
          ListHeaderComponent={
            <HomeHeader
              mode={mode}
              setMode={setMode}
              search={search}
              setSearch={setSearch}
              placeholder="ابحث بعنوان المشروع"
              sector={sector}
              setSector={setSector}
              sort={sort}
              setSort={setSort}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              minRevenue={minRevenue}
              setMinRevenue={setMinRevenue}
              maxRevenue={maxRevenue}
              setMaxRevenue={setMaxRevenue}
              activeCount={activeCount}
            />
          }
          ListEmptyComponent={
            loading ? (
              <HomeSkeletonList />
            ) : error ? (
              <EmptyBox text="تعذّر تحميل المشاريع الآن. حاول مرة أخرى." />
            ) : (
              <EmptyBox text="لا توجد مشاريع منشورة تطابق بحثك بعد." />
            )
          }
        />
      ) : (
        <FlatList
          data={franchises ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <FranchiseCard franchise={item} index={index} />}
          contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 16 }}
          ListHeaderComponent={
            <HomeHeader
              mode={mode}
              setMode={setMode}
              search={search}
              setSearch={setSearch}
              placeholder="ابحث باسم العلامة التجارية"
              sector={sector}
              setSector={setSector}
              sort={null}
              setSort={null}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              showAdvanced={false}
              setShowAdvanced={null}
              minRevenue=""
              setMinRevenue={null}
              maxRevenue=""
              setMaxRevenue={null}
              activeCount={activeCount}
            />
          }
          ListEmptyComponent={
            loading ? (
              <HomeSkeletonList />
            ) : error ? (
              <EmptyBox text="تعذّر تحميل الامتيازات الآن. حاول مرة أخرى." />
            ) : (
              <EmptyBox text="لا توجد امتيازات منشورة تطابق بحثك بعد." />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function HomeHeader({
  mode,
  setMode,
  search,
  setSearch,
  placeholder,
  sector,
  setSector,
  sort,
  setSort,
  verifiedOnly,
  setVerifiedOnly,
  showAdvanced,
  setShowAdvanced,
  minRevenue,
  setMinRevenue,
  maxRevenue,
  setMaxRevenue,
  activeCount,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  search: string;
  setSearch: (s: string) => void;
  placeholder: string;
  sector: BusinessSector | null;
  setSector: (s: BusinessSector | null) => void;
  sort: SortOption | null;
  setSort: ((s: SortOption) => void) | null;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  showAdvanced: boolean;
  setShowAdvanced: ((cb: (v: boolean) => boolean) => void) | null;
  minRevenue: string;
  setMinRevenue: ((v: string) => void) | null;
  maxRevenue: string;
  setMaxRevenue: ((v: string) => void) | null;
  activeCount?: number;
}) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 9, backgroundColor: t.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, ...t.shadowSm }}>
        <SearchIcon color={t.textMuted} size={15} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={placeholder}
          placeholderTextColor={t.textMuted}
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 13, color: t.text, textAlign: "right" }}
        />
      </View>

      {activeCount != null ? (
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.primary }} />
          <Text style={{ fontFamily: fonts.numeric, fontSize: 10.5, color: t.textMuted, direction: "ltr" }}>
            {activeCount} {mode === "listings" ? "فرصة نشطة" : "امتياز متاح"}
          </Text>
        </View>
      ) : null}

      <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>
        <Chip label="الكل" active={sector === null} onPress={() => setSector(null)} />
        {SECTOR_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} active={sector === opt.value} onPress={() => setSector(opt.value)} />
        ))}
      </ScrollView>

      {sort && setSort ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>
          {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
            <Chip key={opt} label={SORT_LABELS[opt]} active={sort === opt} onPress={() => setSort(opt)} />
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <Switch value={verifiedOnly} onValueChange={setVerifiedOnly} trackColor={{ true: t.success, false: t.border }} />
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.textMuted }}>الموثّقة فقط</Text>
        </View>

        {setShowAdvanced ? (
          <Tappable onPress={() => setShowAdvanced((v) => !v)} haptic="none">
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 12.5, color: t.primary }}>
              {showAdvanced ? "إخفاء الفلاتر المتقدمة" : "فلاتر متقدمة"}
            </Text>
          </Tappable>
        ) : null}
      </View>

      {showAdvanced && setMinRevenue && setMaxRevenue ? (
        <View style={{ flexDirection: "row-reverse", gap: 10, backgroundColor: t.surface, borderRadius: radius.lg, padding: 12, ...t.shadowSm }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}>الحد الأدنى للإيراد</Text>
            <TextInput
              value={minRevenue}
              onChangeText={setMinRevenue}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={t.textMuted}
              style={{ height: 38, borderRadius: radius.md, backgroundColor: t.surface2, paddingHorizontal: 12, fontFamily: fonts.numeric, fontSize: 13, color: t.text, textAlign: "left" }}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}>الحد الأقصى للإيراد</Text>
            <TextInput
              value={maxRevenue}
              onChangeText={setMaxRevenue}
              keyboardType="number-pad"
              placeholder="بلا حد"
              placeholderTextColor={t.textMuted}
              style={{ height: 38, borderRadius: radius.md, backgroundColor: t.surface2, paddingHorizontal: 12, fontFamily: fonts.numeric, fontSize: 13, color: t.text, textAlign: "left" }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function HomeSkeletonList() {
  return (
    <View style={{ gap: 16 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: 14, backgroundColor: "transparent" }}>
          <Skeleton width="100%" height={140} radius={radius.lg} />
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </View>
      ))}
    </View>
  );
}

function EmptyBox({ text }: { text: string }) {
  const { t } = useTheme();
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: radius.xl, padding: 40, alignItems: "center", ...t.shadowSm }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center" }}>{text}</Text>
    </View>
  );
}
