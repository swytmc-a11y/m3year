import { supabase } from "@/lib/supabase";
import type { Listing } from "@/lib/constants";
import type { Franchise } from "@/lib/franchise-constants";

export async function isFavorited(listingId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();
  return !!data;
}

export async function toggleFavorite(
  listingId: string,
  currentlyFavorited: boolean,
): Promise<{ favorited: boolean; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { favorited: currentlyFavorited, error: "سجّل الدخول لحفظ الإعلانات." };

  if (currentlyFavorited) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (error) {
      console.error("[favorites] remove failed", error);
      return { favorited: true, error: "تعذّر الإزالة من المفضلة الآن." };
    }
    return { favorited: false };
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, listing_id: listingId });
  if (error) {
    console.error("[favorites] add failed", error);
    return { favorited: false, error: "تعذّر الحفظ في المفضلة الآن." };
  }
  return { favorited: true };
}

export async function listMyFavorites(): Promise<{ data?: Listing[]; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  const { data, error } = await supabase
    .from("favorites")
    .select("listing:listings(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[favorites] list failed", error);
    return { error: "تعذّر تحميل المفضلة الآن." };
  }

  const listings = (data ?? [])
    .map((row) => (row as unknown as { listing: Listing | null }).listing)
    .filter((l): l is Listing => l !== null);
  return { data: listings };
}

export async function isFranchiseFavorited(franchiseId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("franchise_id", franchiseId)
    .maybeSingle();
  return !!data;
}

export async function toggleFranchiseFavorite(
  franchiseId: string,
  currentlyFavorited: boolean,
): Promise<{ favorited: boolean; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { favorited: currentlyFavorited, error: "سجّل الدخول لحفظ الامتيازات." };

  if (currentlyFavorited) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("franchise_id", franchiseId);
    if (error) {
      console.error("[favorites] remove franchise failed", error);
      return { favorited: true, error: "تعذّر الإزالة من المفضلة الآن." };
    }
    return { favorited: false };
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, franchise_id: franchiseId });
  if (error) {
    console.error("[favorites] add franchise failed", error);
    return { favorited: false, error: "تعذّر الحفظ في المفضلة الآن." };
  }
  return { favorited: true };
}

export async function listMyFavoriteFranchises(): Promise<{
  data?: Franchise[];
  error?: string;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  const { data, error } = await supabase
    .from("favorites")
    .select("franchise:franchises(*)")
    .eq("user_id", user.id)
    .not("franchise_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[favorites] list franchises failed", error);
    return { error: "تعذّر تحميل المفضلة الآن." };
  }

  const franchises = (data ?? [])
    .map((row) => (row as unknown as { franchise: Franchise | null }).franchise)
    .filter((f): f is Franchise => f !== null);
  return { data: franchises };
}
