import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, EmptyState, IconButton, SegmentedControl, Skeleton, useRefreshTint } from "@/components/kit";
import { ChevronBackIcon, OpportunityIcon, StorefrontIcon } from "@/components/icons";
import { ListingCard } from "@/components/listings";
import { FranchiseCard } from "@/components/franchises";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { listMyFavorites, listMyFavoriteFranchises } from "@/lib/favorites";
import type { Listing } from "@/lib/constants";
import type { Franchise } from "@/lib/franchise-constants";
import { fonts, radius } from "@/theme";

type Kind = "listings" | "franchises";

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "listings", label: "فرص استثمارية" },
  { value: "franchises", label: "امتيازات تجارية" },
];

export default function FavoritesScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, loading: authLoading } = useAuth();
  const refreshTint = useRefreshTint();
  const [kind, setKind] = useState<Kind>("listings");
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [franchises, setFranchises] = useState<Franchise[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const [listingsRes, franchisesRes] = await Promise.all([listMyFavorites(), listMyFavoriteFranchises()]);
    if (listingsRes.error || franchisesRes.error) setError(true);
    else {
      setListings(listingsRes.data ?? []);
      setFranchises(franchisesRes.data ?? []);
    }
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

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  const rows: (Listing | Franchise)[] = kind === "listings" ? (listings ?? []) : (franchises ?? []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>المفضلة</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) =>
          kind === "listings" ? (
            <ListingCard listing={item as Listing} index={index} />
          ) : (
            <FranchiseCard franchise={item as Franchise} index={index} />
          )
        }
        contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshTint} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 4 }}>
            <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 16 }}>
              <Skeleton width="100%" height={140} radius={radius.lg} />
              <Skeleton width="100%" height={140} radius={radius.lg} />
            </View>
          ) : error ? (
            <EmptyState
              title="تعذّر التحميل"
              description="تعذّر تحميل المفضلة الآن."
              action={<Button label="إعادة المحاولة" variant="secondary" onPress={() => load()} />}
            />
          ) : (
            <EmptyState
              icon={
                kind === "listings" ? (
                  <OpportunityIcon color={t.textMuted} size={20} />
                ) : (
                  <StorefrontIcon color={t.textMuted} size={20} />
                )
              }
              title={kind === "listings" ? "لم تحفظ أي فرصة بعد" : "لم تحفظ أي امتياز بعد"}
              description="اضغط القلب على أي فرصة أو امتياز لحفظه هنا والرجوع إليه لاحقًا."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
