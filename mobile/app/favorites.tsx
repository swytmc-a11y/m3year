import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/ui";
import { ListingCard } from "@/components/listings";
import { useAuth } from "@/contexts/auth";
import { listMyFavorites } from "@/lib/favorites";
import type { Listing } from "@/lib/constants";
import { colors, fonts } from "@/theme";

export default function FavoritesScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await listMyFavorites();
    if (err) setError(true);
    else setListings(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [load, session]),
  );

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title="المفضلة" onBack={() => router.back()} />
      <FlatList
        data={listings ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : (
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
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText }}>
                {error ? "تعذّر تحميل المفضلة الآن." : "لم تحفظ أي إعلان بعد."}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
