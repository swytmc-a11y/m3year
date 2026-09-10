import { useCallback, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { useFocusEffect, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, EmptyState, IconButton, Skeleton, useTabBarSpacing, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { CarCard, type FeedCar } from "@/components/car-card";
import { listFavoriteCars, toggleFavorite } from "@/lib/favorites";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";

export default function FavoritesScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();
  const [cars, setCars] = useState<FeedCar[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await listFavoriteCars();
        if (active) setCars(rows);
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
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>المفضلة</Text>
      </View>

      {cars === null ? (
        <View style={{ padding: 18, gap: 16 }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} width="100%" height={260} radius={radius.xl} />
          ))}
        </View>
      ) : cars.length === 0 ? (
        <EmptyState
          title="لا توجد سيارات محفوظة"
          description="احفظ السيارات التي تعجبك لتجدها هنا بسرعة."
          action={<Button label="تصفّح السيارات" onPress={() => router.push("/")} />}
        />
      ) : (
        <FlatList
          data={cars}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: tabSpacing }}
          renderItem={({ item }) => (
            <CarCard
              car={item}
              favorited
              // Unfavouriting here removes the card from the list it is in,
              // which is the only sensible outcome on this screen.
              onToggleFavorite={async (id) => {
                setCars((prev) => (prev ?? []).filter((c) => c.id !== id));
                try {
                  await toggleFavorite(id);
                } catch (err) {
                  console.error("[favorites] toggle failed", err);
                  return;
                }
                // Removing from a list is one tap and the card is gone from
                // the only screen that showed it, so the way back has to be
                // right there.
                toast("أُزيلت من المفضلة.", "success", {
                  label: "تراجع",
                  onPress: async () => {
                    try {
                      await toggleFavorite(id);
                      setCars(await listFavoriteCars());
                    } catch (err) {
                      console.error("[favorites] undo failed", err);
                    }
                  },
                });
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
