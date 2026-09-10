import * as Location from "expo-location";
import { supabase } from "@/lib/supabase";
import { CAR_CARD_COLUMNS, type CarCardData, distanceKm } from "@/components/cars";
import type { CarCategory, TransmissionType, FuelType } from "@/lib/constants";

export type CarFilters = {
  search: string;
  category: CarCategory | null;
  transmission: TransmissionType | null;
  fuel: FuelType | null;
  branchId: string | null;
  minPrice: string;
  maxPrice: string;
  seats: number | null;
};

export const EMPTY_FILTERS: CarFilters = {
  search: "",
  category: null,
  transmission: null,
  fuel: null,
  branchId: null,
  minPrice: "",
  maxPrice: "",
  seats: null,
};

export const PAGE_SIZE = 12;

export type Coords = { latitude: number; longitude: number };

/**
 * One page of the browse feed.
 *
 * "Cheapest" is applied in SQL because price is a column. "Nearest" cannot
 * be — distance depends on where the phone is — so it is applied after the
 * fetch, and when both are on, cars are grouped by branch distance and
 * sorted by price inside each branch. That is the only ordering that stays
 * explainable to someone looking at the list.
 */
export async function fetchCars({
  page,
  filters,
  cheapest,
  nearest,
  coords,
  startDate,
  endDate,
}: {
  page: number;
  filters: CarFilters;
  cheapest: boolean;
  nearest: boolean;
  coords: Coords | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<{ rows: (CarCardData & { distance: number | null })[]; hasMore: boolean }> {
  let query = supabase
    .from("cars")
    .select(CAR_CARD_COLUMNS)
    .eq("status", "available");

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.transmission) query = query.eq("transmission", filters.transmission);
  if (filters.fuel) query = query.eq("fuel", filters.fuel);
  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.seats) query = query.gte("seats", filters.seats);

  const min = Number(filters.minPrice);
  const max = Number(filters.maxPrice);
  if (filters.minPrice && !Number.isNaN(min)) query = query.gte("daily_price", min);
  if (filters.maxPrice && !Number.isNaN(max)) query = query.lte("daily_price", max);

  const term = filters.search.trim();
  if (term) query = query.or(`make.ilike.%${term}%,model.ilike.%${term}%`);

  // Nearest needs the whole result set to rank it, so paging is disabled
  // while it is on rather than paging a list that is about to be reordered.
  const paging = !(nearest && coords);
  query = cheapest
    ? query.order("daily_price", { ascending: true })
    : query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });

  if (paging) {
    query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  } else {
    query = query.limit(200);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as CarCardData[];

  // The home search promises cars available for the requested trip, so the
  // result must account for existing bookings and maintenance ranges—not
  // merely the generic `available` fleet status.
  let availableRows = rows;
  if (startDate && endDate && endDate > startDate) {
    const checks = await Promise.all(
      rows.map(async (car) => {
        const { data: ranges, error: rangesError } = await supabase.rpc("car_unavailable_ranges", {
          p_car_id: car.id,
        });
        if (rangesError) throw rangesError;
        const blocked = (ranges ?? []).some(
          (range) => startDate < range.end_date && range.start_date < endDate,
        );
        return blocked ? null : car;
      }),
    );
    availableRows = checks.filter((car): car is CarCardData => car !== null);
  }

  const withDistance = availableRows.map((car) => ({
    ...car,
    distance:
      coords && car.branch?.latitude != null && car.branch?.longitude != null
        ? distanceKm(coords, {
            latitude: car.branch.latitude,
            longitude: car.branch.longitude,
          })
        : null,
  }));

  if (nearest && coords) {
    withDistance.sort((a, b) => {
      const da = a.distance ?? Number.POSITIVE_INFINITY;
      const db = b.distance ?? Number.POSITIVE_INFINITY;
      // Same branch => same distance, so price breaks the tie when the
      // customer asked for cheapest too.
      if (Math.abs(da - db) > 0.01) return da - db;
      if (cheapest) return Number(a.daily_price) - Number(b.daily_price);
      return 0;
    });
  }

  return { rows: withDistance, hasMore: paging && rows.length === PAGE_SIZE };
}

/**
 * Asks for location only when the customer actually taps "nearest to me".
 * Returns null on refusal — the caller falls back to the default order and
 * says so, rather than leaving a chip that silently does nothing.
 */
export async function requestCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}
