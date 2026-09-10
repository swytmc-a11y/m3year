import { useCallback, useState } from "react";
import { View, Text, FlatList, Switch } from "react-native";
import { useFocusEffect, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, EmptyState, IconButton, Tappable, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import {
  listSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  setSavedSearchNotify,
  type SavedSearch,
} from "@/lib/saved-searches";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import {
  CAR_CATEGORY_LABELS,
  TRANSMISSION_LABELS,
  FUEL_LABELS,
  type CarCategory,
  type TransmissionType,
  type FuelType,
} from "@/lib/constants";
import { fonts } from "@/theme";

/** Human summary of what a saved search actually matches. */
function describe(s: SavedSearch): string {
  const f = s.filters ?? {};
  const parts: string[] = [];
  if (f.category) parts.push(CAR_CATEGORY_LABELS[f.category as CarCategory]);
  if (f.transmission) parts.push(TRANSMISSION_LABELS[f.transmission as TransmissionType]);
  if (f.fuel) parts.push(FUEL_LABELS[f.fuel as FuelType]);
  if (f.seats) parts.push(`${f.seats}+ مقاعد`);
  if (f.maxPrice) parts.push(`حتى ${f.maxPrice} ر.س`);
  if (f.text) parts.push(`"${f.text}"`);
  return parts.length > 0 ? parts.join(" · ") : "كل السيارات";
}

export default function SavedSearchesScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<SavedSearch[] | null>(null);

  const reload = useCallback(async () => {
    setRows(await listSavedSearches());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const next = await listSavedSearches();
        if (active) setRows(next);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (authLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!session) return <Redirect href="/auth" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>
          عمليات البحث المحفوظة
        </Text>
      </View>

      {rows === null ? (
        <View style={{ flex: 1 }} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="لا يوجد بحث محفوظ"
          description="احفظ بحثك من شاشة التصفّح لننبّهك عند توفّر سيارة مطابقة."
          action={<Button label="تصفّح السيارات" onPress={() => router.push("/search")} />}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 18, gap: 12 }}
          renderItem={({ item }) => (
            <Card style={{ padding: 18, gap: 12 }}>
              {/* A saved search you cannot re-run is only half a feature:
                  tapping it re-opens the browse screen with these exact
                  filters applied. */}
              <Tappable
                onPress={() =>
                  router.push({
                    pathname: "/search",
                    params: { filters: JSON.stringify(item.filters ?? {}) },
                  })
                }
                haptic="light"
              >
                <View style={{ gap: 6 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text, textAlign: "right" }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                    {describe(item)}
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: t.primary, textAlign: "right" }}>
                    عرض النتائج
                  </Text>
                </View>
              </Tappable>

              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text }}>
                    التنبيهات
                  </Text>
                  <Switch
                    value={item.notify}
                    trackColor={{ true: t.primary, false: t.border }}
                    onValueChange={async (v) => {
                      await setSavedSearchNotify(item.id, v);
                      await reload();
                    }}
                  />
                </View>

                <Tappable
                  onPress={async () => {
                    await deleteSavedSearch(item.id);
                    await reload();
                    // Undo re-creates the search rather than resurrecting the
                    // deleted row, so it comes back at the top of the list —
                    // nothing is lost, only its place in the order.
                    toast("حُذف البحث.", "success", {
                      label: "تراجع",
                      onPress: async () => {
                        const res = await createSavedSearch(item.name, item.filters);
                        if (res.error) {
                          toast(res.error, "error");
                          return;
                        }
                        await reload();
                      },
                    });
                  }}
                  haptic="light"
                >
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.danger }}>
                    حذف
                  </Text>
                </Tappable>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}
