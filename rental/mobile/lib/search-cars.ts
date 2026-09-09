import { supabase } from "@/lib/supabase";
import type { FeedCar } from "@/components/car-card";
import type { CarCategory, TransmissionType, FuelType } from "@/lib/constants";

export type SearchFilters = {
  text: string;
  category: CarCategory | null;
  transmission: TransmissionType | null;
  fuel: FuelType | null;
  branchId: string | null;
  seats: number | null;
  maxPrice: number | null;
  sort: "recommended" | "cheapest" | "rating";
};

export const EMPTY_SEARCH: SearchFilters = {
  text: "",
  category: null,
  transmission: null,
  fuel: null,
  branchId: null,
  seats: null,
  maxPrice: null,
  sort: "recommended",
};

export function countActiveFilters(f: SearchFilters): number {
  return [
    f.category,
    f.transmission,
    f.fuel,
    f.branchId,
    f.seats,
    f.maxPrice,
  ].filter((v) => v != null).length;
}

const COLUMNS =
  "id, make, make_latin, model, year, category, transmission, fuel, seats, daily_price, monthly_price, cover_image, rating_avg, rating_count, branch:branches(id, name, city)";

/**
 * One page of search results, with the exact count of everything matching.
 *
 * The count is what lets the screen say "32 cars available" while showing
 * the first twelve, and it comes from the same query as the rows so the two
 * can never disagree.
 */
export async function searchCars({
  filters,
  dates,
  page,
  pageSize = 12,
}: {
  filters: SearchFilters;
  dates?: { start: string; end: string } | null;
  page: number;
  pageSize?: number;
}): Promise<{ rows: FeedCar[]; total: number }> {
  let taken: string[] = [];
  if (dates) {
    const { data, error } = await supabase.rpc("cars_unavailable_between", {
      p_start: dates.start,
      p_end: dates.end,
    });
    if (error) throw error;
    taken = (data ?? []) as unknown as string[];
  }

  let q = supabase
    .from("cars")
    .select(COLUMNS, { count: "exact" })
    .eq("status", "available");

  if (taken.length > 0) q = q.not("id", "in", `(${taken.join(",")})`);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.transmission) q = q.eq("transmission", filters.transmission);
  if (filters.fuel) q = q.eq("fuel", filters.fuel);
  if (filters.branchId) q = q.eq("branch_id", filters.branchId);
  if (filters.seats) q = q.gte("seats", filters.seats);
  if (filters.maxPrice) q = q.lte("daily_price", filters.maxPrice);

  const term = filters.text.trim();
  if (term) q = q.or(`make.ilike.%${term}%,model.ilike.%${term}%,make_latin.ilike.%${term}%`);

  if (filters.sort === "cheapest") q = q.order("daily_price", { ascending: true });
  else if (filters.sort === "rating")
    q = q.order("rating_avg", { ascending: false, nullsFirst: false });
  else q = q.order("sort_order", { ascending: true }).order("created_at", { ascending: false });

  const { data, error, count } = await q.range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;

  // Badges are a separate derived set; joining them per row in PostgREST is
  // not possible, so they are merged here against the page just fetched.
  const rows = (data ?? []) as unknown as FeedCar[];
  const { data: badges } = await supabase.rpc("car_badges");
  const byId = new Map(
    ((badges ?? []) as unknown as { car_id: string; badge: string | null }[])
      .filter((b) => b.badge)
      .map((b) => [b.car_id, b.badge as string]),
  );

  return {
    rows: rows.map((r) => ({ ...r, badge: byId.get(r.id) ?? null })),
    total: count ?? rows.length,
  };
}
