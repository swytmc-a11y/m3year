import { useCallback, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, Skeleton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
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
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 16 }}>
              <Skeleton width="100%" height={140} radius={radius.lg} />
              <Skeleton width="100%" height={140} radius={radius.lg} />
            </View>
          ) : (
            <View style={{ backgroundColor: t.surface, borderRadius: radius.xl, padding: 40, alignItems: "center", ...t.shadowSm }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted }}>
                {error ? "تعذّر تحميل المفضلة الآن." : "لم تحفظ أي إعلان بعد."}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
