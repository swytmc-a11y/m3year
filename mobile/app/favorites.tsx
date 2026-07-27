import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, EmptyState, IconButton, Skeleton, useRefreshTint } from "@/components/kit";
import { ChevronBackIcon, HeartIcon } from "@/components/icons";
import { ListingCard } from "@/components/listings";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { listMyFavorites } from "@/lib/favorites";
import type { Listing } from "@/lib/constants";
import { fonts, radius } from "@/theme";

export default function FavoritesScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, loading: authLoading } = useAuth();
  const refreshTint = useRefreshTint();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: err } = await listMyFavorites();
    if (err) setError(true);
    else setListings(data ?? []);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>المفضلة</Text>
      </View>
      <FlatList
        data={listings ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <ListingCard listing={item} index={index} />}
        contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshTint} />}
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
              icon={<HeartIcon color={t.textMuted} size={20} />}
              title="لم تحفظ أي إعلان بعد"
              description="اضغط القلب على أي فرصة لحفظها هنا والرجوع إليها لاحقًا."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
