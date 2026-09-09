import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * The cars and branches a banner may point at. Shared by the new and edit
 * pages so the two dropdowns can never drift apart.
 */
export async function fetchBannerTargets(supabase: Client): Promise<{
  cars: { id: string; label: string }[];
  branches: { id: string; label: string }[];
}> {
  const [{ data: carRows }, { data: branchRows }] = await Promise.all([
    supabase
      .from("cars")
      .select("id, make, model, year, status")
      .order("make")
      .limit(300),
    supabase.from("branches").select("id, name, city").order("name"),
  ]);

  return {
    // Draft and hidden cars are listed but marked: pointing a banner at one
    // is a mistake worth seeing rather than a car silently missing from the
    // dropdown.
    cars: (carRows ?? []).map((c) => ({
      id: c.id,
      label:
        `${c.make} ${c.model} ${c.year}` +
        (c.status === "available" ? "" : " — غير منشورة"),
    })),
    branches: (branchRows ?? []).map((b) => ({ id: b.id, label: `${b.name} — ${b.city}` })),
  };
}
