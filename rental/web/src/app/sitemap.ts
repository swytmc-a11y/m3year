import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();

  const { data: cars } = await supabase
    .from("cars")
    .select("id, updated_at")
    .eq("status", "available")
    .limit(1000);

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...(cars ?? []).map((car) => ({
      url: `${SITE_URL}/cars/${car.id}`,
      lastModified: new Date(car.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
