import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

const SITE_URL = "https://miyear.site";

/**
 * Every published listing and franchise, so search engines can index the
 * individual ads rather than only the two index pages. Reads through the
 * normal anon client, so RLS decides what is public — a draft or a
 * pending-review ad can never leak into the sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/listings`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/franchises`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const supabase = createPublicClient();
    const [listings, franchises] = await Promise.all([
      supabase
        .from("listings")
        .select("id, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(5000),
      supabase
        .from("franchises")
        .select("id, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(5000),
    ]);

    return [
      ...staticRoutes,
      ...(listings.data ?? []).map((row) => ({
        url: `${SITE_URL}/listings/${row.id}`,
        lastModified: new Date(row.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...(franchises.data ?? []).map((row) => ({
        url: `${SITE_URL}/franchises/${row.id}`,
        lastModified: new Date(row.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (err) {
    // A sitemap that 500s is worse than a sitemap listing only the static
    // pages — crawlers back off from an erroring one.
    console.error("[sitemap] dynamic entries failed", err);
    return staticRoutes;
  }
}
