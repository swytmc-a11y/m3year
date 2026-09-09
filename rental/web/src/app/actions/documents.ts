"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Customer identity documents live in a private bucket, so viewing one means
 * minting a short-lived signed URL. That is done here, on demand, rather than
 * when the bookings page renders: generating a URL for every customer whose
 * booking happens to be on screen would hand out access to documents nobody
 * asked to see, and put them in the page source.
 */

const VIEW_WINDOW_SECONDS = 300;

export async function getDocumentUrl(path: string): Promise<{ url?: string; error?: string }> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("customer-documents")
    .createSignedUrl(path, VIEW_WINDOW_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[documents] could not sign url", path, error);
    return { error: "تعذّر فتح المستند." };
  }
  return { url: data.signedUrl };
}

/**
 * The operator's own sign-off, separate from the automated check.
 *
 * The machine's verdict says the upload looks like a real document; this says
 * a person looked at it and is willing to release a car against it. Recorded
 * so it is clear who accepted a rental if it is ever questioned.
 */
export async function approveCustomerDocuments(formData: FormData) {
  const admin = await requireAdmin();
  const customerId = String(formData.get("customer_id"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      documents_approved_at: new Date().toISOString(),
      documents_approved_by: admin.id,
    })
    .eq("id", customerId);

  if (error) {
    console.error("[documents] approve failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: "customer.documents_approved",
    p_entity_type: "profile",
    p_entity_id: customerId,
    p_metadata: {},
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/users");
}
