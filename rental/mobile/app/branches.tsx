import { useEffect, useState } from "react";
import { View, Text, FlatList, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, EmptyState, IconButton, Skeleton, useTabBarSpacing } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/theme";
import { requestCoords, distanceKm, formatDistance, type Coords } from "@/lib/geo";
import { countAr, CARS_NOUN } from "@/lib/arabic";
import { fonts, radius } from "@/theme";

type Branch = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  working_hours: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function BranchesScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [carCounts, setCarCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data }, { data: cars }] = await Promise.all([
        supabase
          .from("branches")
          .select("id, name, city, address, phone, whatsapp, working_hours, latitude, longitude")
          .eq("is_active", true)
          .order("sort_order"),
        supabase.from("cars").select("branch_id").eq("status", "available"),
      ]);
      if (!active) return;
      setBranches((data ?? []) as Branch[]);
      setCarCounts(
        (cars ?? []).reduce<Record<string, number>>((acc, row) => {
          acc[row.branch_id] = (acc[row.branch_id] ?? 0) + 1;
          return acc;
        }, {}),
      );
    })();
    return () => {
      active = false;
    };
  }, []);

  // Ordering by distance is only offered once the customer opts in, so the
  // screen never asks for location just to render a list.
  const sorted = (branches ?? [])
    .map((b) => ({
      branch: b,
      distance:
        coords && b.latitude != null && b.longitude != null
          ? distanceKm(coords, { latitude: b.latitude, longitude: b.longitude })
          : null,
    }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>الفروع</Text>
      </View>

      {branches === null ? (
        <View style={{ padding: 18, gap: 14 }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} width="100%" height={130} radius={radius.xl} />
          ))}
        </View>
      ) : branches.length === 0 ? (
        <EmptyState title="لا توجد فروع" description="سنضيف فروعنا قريبًا." />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(row) => row.branch.id}
          contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: tabSpacing }}
          ListHeaderComponent={
            coords ? null : (
              <View style={{ marginBottom: 4 }}>
                <Button
                  label="رتّب حسب الأقرب لي"
                  variant="secondary"
                  fullWidth
                  onPress={async () => setCoords(await requestCoords())}
                />
              </View>
            )
          }
          renderItem={({ item }) => {
            const b = item.branch;
            return (
              <Card style={{ padding: 18, gap: 10 }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text, textAlign: "right" }}>
                      {b.name}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", marginTop: 2 }}>
                      {b.city}
                      {b.address ? ` · ${b.address}` : ""}
                    </Text>
                  </View>
                  {item.distance != null ? (
                    <Text style={{ fontFamily: fonts.numeric, fontSize: 12, color: t.primary }}>
                      {formatDistance(item.distance)}
                    </Text>
                  ) : null}
                </View>

                {b.working_hours ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "right" }}>
                    {b.working_hours}
                  </Text>
                ) : null}

                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "right" }}>
                  {countAr(carCounts[b.id] ?? 0, CARS_NOUN)} متاحة
                </Text>

                <View style={{ flexDirection: "row-reverse", gap: 10 }}>
                  {b.phone ? (
                    <Button label="اتصال" variant="secondary" onPress={() => Linking.openURL(`tel:${b.phone}`)} />
                  ) : null}
                  {b.whatsapp ? (
                    <Button
                      label="واتساب"
                      variant="secondary"
                      onPress={() => Linking.openURL(`https://wa.me/${b.whatsapp!.replace(/[^0-9]/g, "")}`)}
                    />
                  ) : null}
                  {b.latitude != null && b.longitude != null ? (
                    <Button
                      label="الموقع"
                      variant="secondary"
                      onPress={() =>
                        Linking.openURL(`https://maps.google.com/?q=${b.latitude},${b.longitude}`)
                      }
                    />
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
