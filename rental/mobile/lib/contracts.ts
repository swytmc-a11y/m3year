import { supabase } from "@/lib/supabase";

export type BookingContract = {
  id: string;
  file_name: string;
  content_type: string | null;
  uploaded_at: string;
  storage_path: string;
};

/**
 * The signed contract for a booking, if staff have filed one and the rental
 * has started. Row-level security decides both of those; nothing here has to
 * re-check them, and nothing here should — a second, weaker check in the app
 * is how a rule quietly drifts from what the database actually enforces.
 */
export async function fetchBookingContract(
  bookingId: string,
): Promise<BookingContract | null> {
  const { data, error } = await supabase
    .from("booking_contracts")
    .select("id, file_name, content_type, uploaded_at, storage_path")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/**
 * A short-lived link to the contract file. The bucket is private, so this is
 * the only way to open it, and the URL expires rather than becoming a
 * permanent public link to someone's signed agreement.
 */
export async function contractUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(path, 60 * 10);

  if (error || !data) {
    console.error("[contracts] signed url failed", error);
    return null;
  }
  return data.signedUrl;
}
