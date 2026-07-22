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
