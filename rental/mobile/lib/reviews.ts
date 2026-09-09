import { supabase } from "@/lib/supabase";

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  author_name: string | null;
  created_at: string;
};

export type ReviewableBooking = {
  id: string;
  reference: string;
  start_date: string;
  end_date: string;
  car: { id: string; make: string; model: string; year: number; cover_image: string | null } | null;
  branch_id: string;
  car_id: string;
};

/**
 * Public reviews for one car. author_name is denormalised onto the row
 * precisely so this read needs no join to profiles — RLS would deny it.
 */
export async function fetchCarReviews(carId: string, limit = 20): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, author_name, created_at")
    .eq("car_id", carId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Completed bookings the signed-in customer has not reviewed yet. The unique
 * constraint on reviews.booking_id makes "already reviewed" a fact we can
 * read rather than a race to guard against.
 */
export async function fetchReviewableBookings(): Promise<ReviewableBooking[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data: reviewed } = await supabase
    .from("reviews")
    .select("booking_id")
    .eq("author_id", auth.user.id);

  const reviewedIds = new Set((reviewed ?? []).map((r) => r.booking_id));

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, reference, start_date, end_date, car_id, branch_id, car:cars(id, make, model, year, cover_image)",
    )
    .eq("customer_id", auth.user.id)
    .eq("status", "completed")
    .order("end_date", { ascending: false })
    .limit(20);

  if (error) throw error;
  return ((data ?? []) as unknown as ReviewableBooking[]).filter((b) => !reviewedIds.has(b.id));
}

export async function submitReview(input: {
  bookingId: string;
  carId: string;
  branchId: string;
  rating: number;
  comment: string | null;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("not_signed_in");

  const { error } = await supabase.from("reviews").insert({
    booking_id: input.bookingId,
    car_id: input.carId,
    branch_id: input.branchId,
    author_id: auth.user.id,
    rating: input.rating,
    comment: input.comment?.trim() || null,
  });

  if (error) throw error;
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
