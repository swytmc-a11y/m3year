import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Switch,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Chip } from "@/components/ui";
import { FadeInView } from "@/components/motion";
import { PlusIcon } from "@/components/icons";
import { ListingCard } from "@/components/listings";
import { supabase } from "@/lib/supabase";
import {
  SECTOR_OPTIONS,
  type Listing,
  type BusinessSector,
} from "@/lib/constants";
import { colors, fonts, radius } from "@/theme";

type SortOption = "newest" | "revenue_desc" | "percentage_desc";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "الأحدث",
  revenue_desc: "الأعلى إيرادًا",
  percentage_desc: "الأعلى نسبة مطروحة",
};

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<BusinessSector | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minRevenue, setMinRevenue] = useState("");
  const [maxRevenue, setMaxRevenue] = useState("");

  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
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
  }, [sector, verifiedOnly, search, sort, minRevenue, maxRevenue]);

  // Debounce so typing in search/range fields doesn't fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.grid,
        }}
      >
        {/* In RTL the create action sits at the leading (top-right) corner. */}
        <Pressable
          onPress={() => router.push("/my-listings/new")}
          accessibilityRole="button"
          accessibilityLabel="إنشاء إعلان"
          style={({ pressed }) => ({
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.ink,
            paddingVertical: 9,
            paddingHorizontal: 14,
            borderRadius: radius.pill,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <PlusIcon color={colors.white} size={16} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white }}>
            إعلان جديد
          </Text>
        </Pressable>

        <Logo size={22} />
      </View>

      <FlatList
        data={listings ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <FadeInView delay={Math.min(index, 8) * 45}>
            <ListingCard listing={item} />
          </FadeInView>
        )}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث بعنوان المشروع"
              placeholderTextColor={colors.mutedText}
              style={{
                height: 46,
                borderWidth: 1,
                borderColor: colors.grid,
                borderRadius: 10,
                backgroundColor: colors.white,
                paddingHorizontal: 16,
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.ink,
                textAlign: "right",
              }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}
            >
              <Chip
                label="الكل"
                active={sector === null}
                onPress={() => setSector(null)}
              />
              {SECTOR_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={sector === opt.value}
                  onPress={() => setSector(opt.value)}
                />
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                <Chip
                  key={opt}
                  label={SORT_LABELS[opt]}
                  active={sort === opt}
                  onPress={() => setSort(opt)}
                />
              ))}
            </ScrollView>

            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                <Switch
                  value={verifiedOnly}
                  onValueChange={setVerifiedOnly}
                  trackColor={{ true: colors.verify, false: colors.grid }}
                />
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14,
                    color: colors.subtleText,
                  }}
                >
                  الموثّقة فقط
                </Text>
              </View>

              <Pressable onPress={() => setShowAdvanced((v) => !v)}>
                <Text
                  style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.verify }}
                >
                  {showAdvanced ? "إخفاء الفلاتر المتقدمة" : "فلاتر متقدمة"}
                </Text>
              </Pressable>
            </View>

            {showAdvanced ? (
              <View
                style={{
                  flexDirection: "row-reverse",
                  gap: 10,
                  backgroundColor: colors.white,
                  borderColor: colors.grid,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  padding: 12,
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.mutedText, textAlign: "right" }}>
                    الحد الأدنى للإيراد
                  </Text>
                  <TextInput
                    value={minRevenue}
                    onChangeText={setMinRevenue}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.mutedText}
                    style={{
                      height: 40,
                      borderWidth: 1,
                      borderColor: colors.grid,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      fontFamily: fonts.mono,
                      fontSize: 14,
                      color: colors.ink,
                      textAlign: "left",
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.mutedText, textAlign: "right" }}>
                    الحد الأقصى للإيراد
                  </Text>
                  <TextInput
                    value={maxRevenue}
                    onChangeText={setMaxRevenue}
                    keyboardType="number-pad"
                    placeholder="بلا حد"
                    placeholderTextColor={colors.mutedText}
                    style={{
                      height: 40,
                      borderWidth: 1,
                      borderColor: colors.grid,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      fontFamily: fonts.mono,
                      fontSize: 14,
                      color: colors.ink,
                      textAlign: "left",
                    }}
                  />
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : error ? (
            <EmptyBox text="تعذّر تحميل المشاريع الآن. حاول مرة أخرى." />
          ) : (
            <EmptyBox text="لا توجد مشاريع منشورة تطابق بحثك بعد." />
          )
        }
      />
    </SafeAreaView>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderColor: colors.grid,
        borderWidth: 1,
        borderRadius: 12,
        padding: 40,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.mutedText,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    </View>
  );
}
