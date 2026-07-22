import { supabase } from "@/lib/supabase";

/** Uploads a local image URI (native file:// or web blob:/data:) to a public bucket. */
export async function uploadListingPhoto(
  listingId: string,
  localUri: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const ext = blob.type.split("/")[1] ?? "jpg";
    const path = `${listingId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("listing-photos")
      .upload(path, blob, { contentType: blob.type, upsert: false });

    if (error) {
      console.error("[storage] listing photo upload failed", error);
      return { error: "تعذّر رفع الصورة الآن." };
    }

    const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (err) {
    console.error("[storage] listing photo upload threw", err);
    return { error: "تعذّر رفع الصورة الآن." };
  }
}

export async function deleteListingPhoto(publicUrl: string): Promise<void> {
  const marker = "/listing-photos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  const { error } = await supabase.storage.from("listing-photos").remove([path]);
  if (error) console.error("[storage] listing photo delete failed", error);
}

/**
 * Uploads the owner's financial statement to the private verification-docs
 * bucket. Storage RLS scopes the path's first segment to the verification
 * request id, so only the owner, the assigned accountant, and admins can
 * read it back (see verification_docs_stakeholders_select policy).
 */
export async function uploadFinancialStatement(
  verificationRequestId: string,
  localUri: string,
  fileName: string,
): Promise<{ path?: string; error?: string }> {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const path = `${verificationRequestId}/${Date.now()}-${fileName}`;

    const { error } = await supabase.storage
      .from("verification-docs")
      .upload(path, blob, { contentType: blob.type || "application/octet-stream", upsert: false });

    if (error) {
      console.error("[storage] financial statement upload failed", error);
      return { error: "تعذّر رفع الملف الآن." };
    }
    return { path };
  } catch (err) {
    console.error("[storage] financial statement upload threw", err);
    return { error: "تعذّر رفع الملف الآن." };
  }
}

export async function getVerificationDocSignedUrl(
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("verification-docs")
    .createSignedUrl(path, 60 * 60);
  if (error) {
    console.error("[storage] signed url failed", error);
    return null;
  }
  return data.signedUrl;
}
