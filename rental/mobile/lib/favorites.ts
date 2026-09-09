import { supabase } from "@/lib/supabase";
import type { FeedCar } from "@/components/car-card";

const FAVORITE_COLUMNS =
  "id, make, make_latin, model, year, category, transmission, fuel, seats, daily_price, monthly_price, cover_image, rating_avg, rating_count, branch:branches(id, name, city)";

/**
 * Favourites are a per-user list, guarded by RLS to the owning user, so no
 * ownership check is needed here.
 */
export async function listFavoriteCars(): Promise<FeedCar[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select(`car:cars(${FAVORITE_COLUMNS})`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[favorites] load failed", error);
    return [];
  }

  return (data ?? [])
    .map((row) => (row as unknown as { car: FeedCar | null }).car)
    .filter((c): c is FeedCar => c != null)
    // The feed supplies badges; a favourites list does not need them and
    // fetching them here would cost a second round trip for decoration.
    .map((c) => ({ ...c, badge: null }));
}

/**
 * Just the ids. The home screen renders cars it already has from the feed
 * and only needs to know which hearts are filled — fetching the whole
 * favourite car rows to answer that would duplicate the feed.
 */
export async function listFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase.from("favorites").select("car_id");
  if (error) {
    console.error("[favorites] id load failed", error);
    return [];
  }
  return (data ?? []).map((r) => r.car_id);
}

export async function isFavorite(carId: string): Promise<boolean> {
  const { data } = await supabase
    .from("favorites")
    .select("car_id")
    .eq("car_id", carId)
    .maybeSingle();
  return data != null;
}

export async function toggleFavorite(carId: string): Promise<{ favorited: boolean; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { favorited: false, error: "سجّل الدخول أولًا." };

  const already = await isFavorite(carId);
  if (already) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("car_id", carId)
      .eq("user_id", user.id);
    if (error) return { favorited: true, error: "تعذّر التحديث." };
    return { favorited: false };
  }

  const { error } = await supabase.from("favorites").insert({ car_id: carId, user_id: user.id });
  if (error) return { favorited: false, error: "تعذّر التحديث." };
  return { favorited: true };
}
