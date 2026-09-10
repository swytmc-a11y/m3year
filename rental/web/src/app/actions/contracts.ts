"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

/**
 * Files the signed rental contract against a booking.
 *
 * The file itself is uploaded from the browser straight to storage (see
 * ContractUpload), so this only records where it landed. The customer sees
 * it once the rental is active — that rule lives in row-level security, not
 * here, so there is exactly one place it can be changed.
 */
export async function saveBookingContract(input: {
  bookingId: string;
  storagePath: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
}): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("booking_contracts").upsert(
    {
      booking_id: input.bookingId,
      storage_path: input.storagePath,
      file_name: input.fileName,
      content_type: input.contentType,
      size_bytes: input.sizeBytes,
      uploaded_by: admin.id,
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: "booking_id" },
  );

  if (error) {
    console.error("[contracts] save failed", error);
    return { error: "تعذّر حفظ العقد." };
  }

  await supabase.rpc("log_audit", {
    p_action: "contract_uploaded",
    p_entity_type: "booking",
    p_entity_id: input.bookingId,
    p_metadata: { file_name: input.fileName },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/today");
  return {};
}

export async function deleteBookingContract(bookingId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("booking_contracts")
    .select("storage_path")
    .eq("booking_id", bookingId)
    .maybeSingle();

  const { error } = await supabase
    .from("booking_contracts")
    .delete()
    .eq("booking_id", bookingId);

  if (error) {
    console.error("[contracts] delete failed", error);
    return { error: "تعذّر حذف العقد." };
  }

  // The row is what the customer reads, so it goes first; a leftover object
  // is harmless, an orphaned row pointing at nothing is not.
  if (row?.storage_path) {
    await supabase.storage.from("contracts").remove([row.storage_path]);
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/today");
  return {};
}

/** A short-lived link so staff can check what they filed. */
export async function contractSignedUrl(path: string): Promise<string | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("contracts").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
