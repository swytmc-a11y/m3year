import { supabase } from "@/lib/supabase";
import type { CarCategory, TransmissionType, FuelType } from "@/lib/constants";

export type CarDetail = {
  id: string;
  make: string;
  model: string;
  year: number;
  category: CarCategory;
  transmission: TransmissionType;
  fuel: FuelType;
  seats: number;
  doors: number | null;
  color: string | null;
  daily_price: number;
  weekly_price: number | null;
  monthly_price: number | null;
  daily_km_limit: number | null;
  extra_km_fee: number | null;
  min_rental_days: number;
  max_rental_days: number | null;
  images: string[];
  cover_image: string | null;
  features: string[];
  description: string | null;
  confirmation_mode: "instant" | "manual";
  rating_avg: number | null;
  rating_count: number;
  branch: {
    id: string;
    name: string;
    city: string;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    working_hours: string | null;
    deposit_note: string | null;
  } | null;
};

export type CarAddon = {
  addon_id: string;
  price: number;
  name: string;
  description: string | null;
  pricing_type: "per_day" | "one_time";
  sort_order: number;
};

export type UnavailableRange = { start_date: string; end_date: string };

export async function fetchCarDetail(carId: string): Promise<{
  car: CarDetail | null;
  addons: CarAddon[];
  unavailable: UnavailableRange[];
}> {
  const [{ data: car }, { data: addonRows }, { data: ranges }] = await Promise.all([
    supabase
      .from("cars")
      .select(
        "id, make, model, year, category, transmission, fuel, seats, doors, color, daily_price, weekly_price, monthly_price, daily_km_limit, extra_km_fee, min_rental_days, max_rental_days, images, cover_image, features, description, confirmation_mode, rating_avg, rating_count, branch:branches(id, name, city, address, phone, whatsapp, working_hours, deposit_note)",
      )
      .eq("id", carId)
      .maybeSingle(),
    supabase
      .from("car_addons")
      .select("addon_id, price, is_available, addon:addons(name, description, pricing_type, sort_order, is_active)")
      .eq("car_id", carId)
      .eq("is_available", true),
    // Booked and blocked windows in one call, so the calendar can grey them
    // out without the client reasoning about booking statuses itself.
    supabase.rpc("car_unavailable_ranges", { p_car_id: carId }),
  ]);

  const addons: CarAddon[] = ((addonRows ?? []) as unknown as {
    addon_id: string;
    price: number;
    addon: {
      name: string;
      description: string | null;
      pricing_type: "per_day" | "one_time";
      sort_order: number;
      is_active: boolean;
    } | null;
  }[])
    .filter((r) => r.addon?.is_active)
    .map((r) => ({
      addon_id: r.addon_id,
      price: Number(r.price),
      name: r.addon!.name,
      description: r.addon!.description,
      pricing_type: r.addon!.pricing_type,
      sort_order: r.addon!.sort_order,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    car: (car as unknown as CarDetail) ?? null,
    addons,
    unavailable: (ranges ?? []) as UnavailableRange[],
  };
}

export type CouponVerdict =
  | { valid: true; code: string; description: string | null; discount_amount: number }
  | { valid: false; reason: string; message: string };

export type Quote = {
  days: number;
  rate_tier: "daily" | "weekly" | "monthly";
  daily_rate: number;
  rental_total: number;
  addons_total: number;
  subtotal: number;
  coupon: CouponVerdict | null;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  addons: { addon_id: string; name: string; total: number }[];
};

/**
 * Prices a booking on the server. The client mirrors this arithmetic for the
 * tier table, but the number the customer is asked to pay always comes from
 * here so the quote and the charge cannot drift.
 */
export async function quoteBooking(
  carId: string,
  startDate: string,
  endDate: string,
  addonIds: string[],
  couponCode?: string | null,
): Promise<{ quote?: Quote; error?: string }> {
  const { data, error } = await supabase.rpc("quote_booking", {
    p_car_id: carId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_addon_ids: addonIds,
    // A rejected coupon is not an error: the quote comes back priced without
    // it, carrying the reason so the screen can say why.
    p_coupon_code: couponCode?.trim() || undefined,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("below_min_rental_days")) return { error: "المدة أقل من الحد الأدنى لهذه السيارة." };
    if (message.includes("above_max_rental_days")) return { error: "المدة تتجاوز الحد الأقصى لهذه السيارة." };
    if (message.includes("invalid_date_range")) return { error: "اختر تاريخ تسليم بعد تاريخ الاستلام." };
    console.error("[quote] failed", error);
    return { error: "تعذّر حساب السعر الآن." };
  }

  return { quote: data as unknown as Quote };
}

export function isRangeAvailable(
  start: string,
  end: string,
  unavailable: UnavailableRange[],
): boolean {
  // Ranges are half-open on both sides, matching the database: a booking
  // ending on the 5th frees the 5th for the next customer.
  return !unavailable.some((r) => start < r.end_date && r.start_date < end);
}
