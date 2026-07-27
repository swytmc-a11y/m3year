import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  EmptyState,
  IconButton,
  SegmentedControl,
  Sheet,
  Tappable,
} from "@/components/kit";
import { ChevronBackIcon, CompareIcon, SearchIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { SECTOR_LABELS, formatSar, formatPercentage, type Listing } from "@/lib/constants";
import { formatSarRange, type Franchise } from "@/lib/franchise-constants";
import { fonts, radius } from "@/theme";

type Kind = "listings" | "franchises";
type Slot = 0 | 1;

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "listings", label: "فرص استثمارية" },
  { value: "franchises", label: "امتيازات تجارية" },
];

/** One comparison line: the label, both values, and which side wins (if any). */
type Row = { label: string; a: string; b: string; better: Slot | null };

/**
 * Side-by-side comparison of two offers. Numbers alone are hard to weigh across
 * two screens, so this puts them in one column pair and marks the stronger side
 * per metric.
 */
export default function CompareScreen() {
  const router = useRouter();
  const { t } = useTheme();

  const [kind, setKind] = useState<Kind>("listings");
  const [picking, setPicking] = useState<Slot | null>(null);
  const [search, setSearch] = useState("");

  const [options, setOptions] = useState<(Listing | Franchise)[] | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [picked, setPicked] = useState<[string | null, string | null]>([null, null]);

  // Reset the picks when switching kind — a listing and a franchise have no
  // comparable metrics, so a mixed pair would be meaningless.
  useEffect(() => {
    setPicked([null, null]);
  }, [kind]);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    const table = kind === "listings" ? "listings" : "franchises";
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[compare] load failed", error);
      setOptions([]);
    } else {
      setOptions(data as (Listing | Franchise)[]);
    }
    setLoadingOptions(false);
  }, [kind]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  function titleOf(item: Listing | Franchise): string {
    return kind === "listings" ? (item as Listing).title : (item as Franchise).brand_name;
  }

  const selected = useMemo(
    () =>
      picked.map((id) => (id ? (options ?? []).find((o) => o.id === id) ?? null : null)) as [
        (Listing | Franchise) | null,
        (Listing | Franchise) | null,
      ],
    [picked, options],
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim();
    const list = (options ?? []).filter((o) => !picked.includes(o.id));
    if (!q) return list;
    return list.filter((o) => titleOf(o).includes(q));
  }, [options, search, picked, kind]);

  const rows: Row[] = useMemo(() => {
    const [a, b] = selected;
    if (!a || !b) return [];

    // Higher is better for what the investor receives; lower is better for what
    // they pay in.
    const cmp = (x: number | null, y: number | null, higherWins: boolean): Slot | null => {
      if (x == null || y == null || x === y) return null;
      const aWins = higherWins ? x > y : x < y;
      return aWins ? 0 : 1;
    };

    if (kind === "listings") {
      const la = a as Listing;
      const lb = b as Listing;
      return [
        { label: "القطاع", a: SECTOR_LABELS[la.sector], b: SECTOR_LABELS[lb.sector], better: null },
        { label: "المدينة", a: la.city, b: lb.city, better: null },
        {
          label: "الإيراد الشهري",
          a: formatSar(la.monthly_revenue),
          b: formatSar(lb.monthly_revenue),
          better: cmp(la.monthly_revenue, lb.monthly_revenue, true),
        },
        {
          label: "النسبة المطروحة",
          a: formatPercentage(la.offered_percentage),
          b: formatPercentage(lb.offered_percentage),
          better: cmp(la.offered_percentage, lb.offered_percentage, true),
        },
        {
          label: "السعر المطلوب",
          a: la.asking_price != null ? formatSar(la.asking_price) : "—",
          b: lb.asking_price != null ? formatSar(lb.asking_price) : "—",
          better: cmp(la.asking_price, lb.asking_price, false),
        },
        {
          label: "سنة التأسيس",
          a: la.founding_year != null ? String(la.founding_year) : "—",
          b: lb.founding_year != null ? String(lb.founding_year) : "—",
          better: null,
        },
        {
          label: "عدد الموظفين",
          a: la.employee_count != null ? String(la.employee_count) : "—",
          b: lb.employee_count != null ? String(lb.employee_count) : "—",
          better: null,
        },
        {
          label: "التوثيق المالي",
          a: la.verification_status === "verified" ? "موثّق" : "غير موثّق",
          b: lb.verification_status === "verified" ? "موثّق" : "غير موثّق",
          better:
            la.verification_status === lb.verification_status
              ? null
              : la.verification_status === "verified"
                ? 0
                : 1,
        },
      ];
    }

    const fa = a as Franchise;
    const fb = b as Franchise;
    return [
      { label: "القطاع", a: SECTOR_LABELS[fa.sector], b: SECTOR_LABELS[fb.sector], better: null },
      { label: "المدينة", a: fa.city, b: fb.city, better: null },
      {
        label: "رسوم الامتياز",
        a: formatSar(fa.franchise_fee),
        b: formatSar(fb.franchise_fee),
        better: cmp(fa.franchise_fee, fb.franchise_fee, false),
      },
      {
        label: "الاستثمار المبدئي",
        a: formatSarRange(fa.initial_investment_min, fa.initial_investment_max, formatSar),
        b: formatSarRange(fb.initial_investment_min, fb.initial_investment_max, formatSar),
        better: cmp(fa.initial_investment_min, fb.initial_investment_min, false),
      },
      {
        label: "نسبة الإتاوة",
        a: fa.royalty_percentage != null ? formatPercentage(fa.royalty_percentage) : "—",
        b: fb.royalty_percentage != null ? formatPercentage(fb.royalty_percentage) : "—",
        better: cmp(fa.royalty_percentage, fb.royalty_percentage, false),
      },
      {
        label: "استرداد رأس المال",
        a: fa.expected_payback_months != null ? `${fa.expected_payback_months} شهرًا` : "—",
        b: fb.expected_payback_months != null ? `${fb.expected_payback_months} شهرًا` : "—",
        better: cmp(fa.expected_payback_months, fb.expected_payback_months, false),
      },
      {
        label: "عدد الفروع",
        a: fa.current_branches_count != null ? String(fa.current_branches_count) : "—",
        b: fb.current_branches_count != null ? String(fb.current_branches_count) : "—",
        better: cmp(fa.current_branches_count, fb.current_branches_count, true),
      },
      {
        label: "المساحة المطلوبة",
        a: fa.required_space_sqm != null ? `${fa.required_space_sqm} م²` : "—",
        b: fb.required_space_sqm != null ? `${fb.required_space_sqm} م²` : "—",
        better: null,
      },
      {
        label: "التدريب",
        a: fa.training_provided ? "متوفّر" : "غير متوفّر",
        b: fb.training_provided ? "متوفّر" : "غير متوفّر",
        better: fa.training_provided === fb.training_provided ? null : fa.training_provided ? 0 : 1,
      },
    ];
  }, [selected, kind]);

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
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>مقارنة عرضين</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 14 }}>
        <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} />

        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
          <SlotCard
            label="العرض الأول"
            title={selected[0] ? titleOf(selected[0]) : null}
            onPress={() => setPicking(0)}
            onClear={() => setPicked(([, b]) => [null, b])}
          />
          <SlotCard
            label="العرض الثاني"
            title={selected[1] ? titleOf(selected[1]) : null}
            onPress={() => setPicking(1)}
            onClear={() => setPicked(([a]) => [a, null])}
          />
        </View>

        {rows.length > 0 ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {rows.map((row, idx) => (
              <View
                key={row.label}
                style={{
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: t.border,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  gap: 7,
                }}
              >
                <Text style={{ fontFamily: fonts.body, fontSize: 10.5, color: t.textMuted, textAlign: "center" }}>
                  {row.label}
                </Text>
                <View style={{ flexDirection: "row-reverse", gap: 10 }}>
                  <ValueCell text={row.a} best={row.better === 0} />
                  <ValueCell text={row.b} best={row.better === 1} />
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={<CompareIcon color={t.textMuted} size={20} />}
            title="اختر عرضين للمقارنة"
            description="حدّد عرضين من نفس النوع لعرض أرقامهما جنبًا إلى جنب."
          />
        )}
      </ScrollView>

      <Sheet
        visible={picking !== null}
        onClose={() => {
          setPicking(null);
          setSearch("");
        }}
        title={picking === 0 ? "اختر العرض الأول" : "اختر العرض الثاني"}
      >
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 9,
              backgroundColor: t.surface,
              borderRadius: radius.lg,
              paddingHorizontal: 13,
              height: 44,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            <SearchIcon color={t.textMuted} size={15} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث بالاسم"
              placeholderTextColor={t.textMuted}
              style={{ flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: t.text, textAlign: "right" }}
            />
          </View>

          {loadingOptions ? (
            <ActivityIndicator color={t.primary} style={{ paddingVertical: 24 }} />
          ) : filteredOptions.length === 0 ? (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12.5,
                color: t.textMuted,
                textAlign: "center",
                paddingVertical: 24,
              }}
            >
              لا توجد عروض متاحة للاختيار.
            </Text>
          ) : (
            filteredOptions.map((item) => (
              <Tappable
                key={item.id}
                haptic="light"
                onPress={() => {
                  const slot = picking;
                  if (slot === null) return;
                  setPicked((prev) => (slot === 0 ? [item.id, prev[1]] : [prev[0], item.id]));
                  setPicking(null);
                  setSearch("");
                }}
              >
                <View
                  style={{
                    backgroundColor: t.surface,
                    borderRadius: radius.lg,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    gap: 3,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: t.text, textAlign: "right" }}>
                    {titleOf(item)}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted, textAlign: "right" }}>
                    قطاع {SECTOR_LABELS[item.sector]} · {item.city}
                  </Text>
                </View>
              </Tappable>
            ))
          )}
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function SlotCard({
  label,
  title,
  onPress,
  onClear,
}: {
  label: string;
  title: string | null;
  onPress: () => void;
  onClear: () => void;
}) {
  const { t } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Tappable onPress={onPress} haptic="light" accessibilityLabel={label}>
        <View
          style={{
            minHeight: 76,
            borderRadius: radius.xl,
            backgroundColor: t.surface,
            borderWidth: title ? 1 : 1.5,
            borderColor: title ? t.border : t.border,
            borderStyle: title ? "solid" : "dashed",
            padding: 12,
            justifyContent: "center",
            gap: 4,
            ...(title ? t.shadowSm : {}),
          }}
        >
          <Text style={{ fontFamily: fonts.body, fontSize: 10, color: t.textMuted, textAlign: "center" }}>{label}</Text>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: fonts.displayBold,
              fontSize: 12,
              color: title ? t.text : t.textMuted,
              textAlign: "center",
            }}
          >
            {title ?? "اضغط للاختيار"}
          </Text>
        </View>
      </Tappable>
      {title ? (
        <Tappable onPress={onClear} haptic="light" accessibilityLabel={`إزالة ${label}`}>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 10.5,
              color: t.textMuted,
              textAlign: "center",
              paddingVertical: 6,
            }}
          >
            إزالة
          </Text>
        </Tappable>
      ) : null}
    </View>
  );
}

function ValueCell({ text, best }: { text: string; best: boolean }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.md,
        paddingHorizontal: 8,
        paddingVertical: 7,
        backgroundColor: best ? t.successTint : "transparent",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: best ? fonts.numericBold : fonts.numeric,
          fontSize: 11.5,
          color: best ? t.success : t.text,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    </View>
  );
}
