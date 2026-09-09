import { supabase } from "@/lib/supabase";
import { CAR_CARD_COLUMNS, type CarCardData } from "@/components/cars";

/**
 * Favourites are a per-user list, guarded by RLS to the owning user, so no
 * ownership check is needed here.
 */
export async function listFavoriteCars(): Promise<CarCardData[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select(`car:cars(${CAR_CARD_COLUMNS})`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[favorites] load failed", error);
    return [];
  }

  return (data ?? [])
    .map((row) => (row as unknown as { car: CarCardData | null }).car)
    .filter((c): c is CarCardData => c != null);
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
