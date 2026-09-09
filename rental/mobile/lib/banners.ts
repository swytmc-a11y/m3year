import { supabase } from "@/lib/supabase";
import type { CarCategory } from "@/lib/constants";

export type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  target_kind: "none" | "car" | "branch" | "category" | "coupon" | "url";
  target_car_id: string | null;
  target_branch_id: string | null;
  target_category: CarCategory | null;
  target_coupon_code: string | null;
  target_url: string | null;
};

/**
 * Live banners only — the scheduling window and the active flag are enforced
 * by the select policy, so this cannot accidentally show a draft or an
 * expired campaign.
 */
export async function fetchBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("promo_banners")
    .select(
      "id, title, subtitle, image_url, target_kind, target_car_id, target_branch_id, target_category, target_coupon_code, target_url",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data ?? []) as Banner[];
}

/**
 * Where a banner leads, or null when it is decorative. A coupon banner has
 * nowhere of its own to go, so it lands on the fleet with the code in hand.
 */
export function bannerHref(b: Banner): string | null {
  switch (b.target_kind) {
    case "car":
      return b.target_car_id ? `/cars/${b.target_car_id}` : null;
    case "branch":
      return b.target_branch_id ? `/branches` : null;
    case "category":
      return b.target_category ? `/?category=${b.target_category}` : null;
    case "coupon":
      return b.target_coupon_code ? `/?coupon=${b.target_coupon_code}` : null;
    case "url":
      return b.target_url;
    default:
      return null;
  }
}
