import { supabase } from "@/lib/supabase";
import type { BusinessSector } from "@/lib/constants";
import { LISTING_CARD_COLUMNS, type ListingCardData } from "@/components/listings";
import { FRANCHISE_CARD_COLUMNS, type FranchiseCardData } from "@/components/franchises";

/**
 * Records one view of a published ad.
 *
 * Fire-and-forget on purpose: a failed counter must never block or degrade
 * reading the ad itself. The server ignores the owner's own visits and only
 * ever increments by one, so there is nothing here worth retrying.
 */
export async function recordView(targetType: "listing" | "franchise", targetId: string): Promise<void> {
  const { error } = await supabase.rpc("increment_view_count", {
    p_target_type: targetType,
    p_target_id: targetId,
  });
  if (error) console.error("[discovery] view count failed", error);
}

/**
 * Other published ads in the same sector, for the "إعلانات مشابهة" section.
 * Verified and featured ones surface first, since those are the ones worth
 * showing to someone already interested in this sector.
 */
export async function getSimilarListings(
  listingId: string,
  sector: BusinessSector,
  limit = 4,
): Promise<ListingCardData[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_CARD_COLUMNS)
    .eq("status", "published")
    .eq("sector", sector)
    .neq("id", listingId)
    .order("is_featured", { ascending: false })
    .order("verification_status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[discovery] similar listings failed", error);
    return [];
  }
  return (data ?? []) as unknown as ListingCardData[];
}

export async function getSimilarFranchises(
  franchiseId: string,
  sector: BusinessSector,
  limit = 4,
): Promise<FranchiseCardData[]> {
  const { data, error } = await supabase
    .from("franchises")
    .select(FRANCHISE_CARD_COLUMNS)
    .eq("status", "published")
    .eq("sector", sector)
    .neq("id", franchiseId)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[discovery] similar franchises failed", error);
    return [];
  }
  return (data ?? []) as unknown as FranchiseCardData[];
}

export function formatViewCount(count: number): string {
  if (count === 0) return "لا مشاهدات بعد";
  if (count === 1) return "مشاهدة واحدة";
  if (count === 2) return "مشاهدتان";
  if (count <= 10) return `${count} مشاهدات`;
  return `${count} مشاهدة`;
}
