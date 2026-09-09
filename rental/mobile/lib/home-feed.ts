import { supabase } from "@/lib/supabase";
import type { FeedCar } from "@/components/car-card";
import type { FeedBanner } from "@/components/home-parts";

export type HomeCopy = { title: string | null; subtitle: string | null };

export type HomeFeed = {
  copy: Record<string, HomeCopy | undefined>;
  sections: Record<string, FeedCar[] | undefined>;
  banners: FeedBanner[];
  total_available: number;
};

/**
 * The whole home screen in one round trip. Everything the screen draws —
 * headings, three rails, live banners, the availability count — comes back
 * together, so the first paint is one network wait rather than six.
 */
export async function fetchHomeFeed(
  dates?: { start: string; end: string } | null,
): Promise<HomeFeed> {
  const { data, error } = await supabase.rpc("home_feed", {
    p_start: dates?.start,
    p_end: dates?.end,
  });

  if (error) throw error;
  return data as unknown as HomeFeed;
}

/**
 * Section wording, with the shipped copy as the fallback. A heading the
 * operator has not customised still reads correctly, and a slug that has
 * been deleted from content_blocks does not blank out the screen.
 */
export function copyFor(
  feed: HomeFeed | null,
  slug: string,
  fallback: { title: string; subtitle?: string },
): { title: string; subtitle: string | null } {
  const block = feed?.copy?.[slug];
  return {
    title: block?.title?.trim() || fallback.title,
    subtitle: block?.subtitle?.trim() || fallback.subtitle || null,
  };
}
