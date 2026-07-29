import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl, Switch, Alert } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, EmptyState, IconButton, Skeleton, useRefreshTint, useToast } from "@/components/kit";
import { ChevronBackIcon, SearchIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import {
  listSavedSearches,
  setSavedSearchAlerts,
  deleteSavedSearch,
  type SavedSearch,
} from "@/lib/saved-searches";
import { SECTOR_LABELS, formatSar } from "@/lib/constants";
import { fonts, radius } from "@/theme";

/** Human-readable recap of what a saved search actually filters on. */
function describe(s: SavedSearch): string {
  const parts: string[] = [s.kind === "listing" ? "فرص استثمارية" : "امتيازات تجارية"];
  if (s.sector) parts.push(`قطاع ${SECTOR_LABELS[s.sector]}`);
  if (s.city) parts.push(s.city);
  if (s.min_revenue != null) parts.push(`من ${formatSar(s.min_revenue)}`);
  if (s.max_revenue != null) parts.push(`إلى ${formatSar(s.max_revenue)}`);
  if (s.verified_only) parts.push("موثّقة فقط");
  return parts.join(" · ");
}

export default function SavedSearchesScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const refreshTint = useRefreshTint();
  const { session, loading: authLoading } = useAuth();

  const [items, setItems] = useState<SavedSearch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: err } = await listSavedSearches();
    if (err) setError(true);
    else setItems(data ?? []);
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [load, session]),
  );

  if (authLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!session) return <Redirect href="/auth" />;

  async function onToggleAlerts(item: SavedSearch, value: boolean) {
    setItems((prev) => (prev ?? []).map((s) => (s.id === item.id ? { ...s, alerts_enabled: value } : s)));
    const { error: err } = await setSavedSearchAlerts(item.id, value);
    if (err) {
      setItems((prev) => (prev ?? []).map((s) => (s.id === item.id ? { ...s, alerts_enabled: !value } : s)));
      toast(err, "error");
    }
  }

  function onDelete(item: SavedSearch) {
    Alert.alert("حذف البحث المحفوظ؟", `سيتم حذف "${item.name}" وإيقاف تنبيهاته.`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          const { error: err } = await deleteSavedSearch(item.id);
          if (err) return toast(err, "error");
          toast("تم الحذف.", "success");
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>عمليات البحث المحفوظة</Text>
      </View>

      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshTint} />}
        renderItem={({ item }) => (
          <Card style={{ padding: 16, gap: 12 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
                {item.name}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 19 }}>
                {describe(item)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: t.border,
                paddingTop: 12,
                minHeight: 44,
              }}
            >
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.text }}>تنبيهي عند تطابق جديد</Text>
              <Switch
                value={item.alerts_enabled}
                onValueChange={(v) => onToggleAlerts(item, v)}
                trackColor={{ true: t.primary, false: t.border }}
              />
            </View>

            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              <Button label="تصفّح النتائج" onPress={() => router.push("/")} />
              <Button label="حذف" variant="secondary" onPress={() => onDelete(item)} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>
              <Skeleton width="100%" height={120} radius={radius.xl} />
              <Skeleton width="100%" height={120} radius={radius.xl} />
            </View>
          ) : error ? (
            <EmptyState
              title="تعذّر التحميل"
              description="تعذّر تحميل عمليات البحث المحفوظة الآن."
              action={<Button label="إعادة المحاولة" variant="secondary" onPress={() => load()} />}
            />
          ) : (
            <EmptyState
              icon={<SearchIcon color={t.textMuted} size={20} />}
              title="لا توجد عمليات بحث محفوظة"
              description="اضبط عوامل التصفية في الصفحة الرئيسية ثم احفظها لتصلك تنبيهات عند ظهور فرصة مطابقة."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
