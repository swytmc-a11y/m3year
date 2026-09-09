import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";

/**
 * The identity details a branch needs before releasing a car.
 *
 * Collected once per customer rather than per booking, and stored in a private
 * bucket under a folder named after the customer's own user id — the storage
 * policies only let someone write inside their own folder, so the path is the
 * access control.
 */

export type DocumentCheck = "pending" | "accepted" | "rejected";

export type CustomerDocuments = {
  full_name: string | null;
  national_id: string | null;
  license_number: string | null;
  id_document_path: string | null;
  license_document_path: string | null;
  documents_check: DocumentCheck | null;
  documents_check_note: string | null;
};

export type DocumentKind = "id" | "license";

/** Everything the booking gate requires. Mirrors is_documents_ready() in SQL. */
export function isDocumentsReady(d: CustomerDocuments | null): boolean {
  if (!d) return false;
  return Boolean(
    d.national_id &&
      d.id_document_path &&
      d.license_document_path &&
      d.documents_check !== "rejected",
  );
}

export async function fetchMyDocuments(): Promise<CustomerDocuments | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "full_name, national_id, license_number, id_document_path, license_document_path, documents_check, documents_check_note",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[documents] load failed", error);
    return null;
  }
  return (data as CustomerDocuments) ?? null;
}

/** A Saudi national ID or iqama number. Matched by the database constraint too. */
export function isValidNationalId(value: string): boolean {
  return /^[0-9]{10}$/.test(value.trim());
}

export async function saveMyDetails(input: {
  fullName: string;
  nationalId: string;
  licenseNumber: string;
}): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  if (input.fullName.trim().length < 2) return { error: "أدخل اسمك كما في الهوية." };
  if (!isValidNationalId(input.nationalId)) {
    return { error: "رقم الهوية أو الإقامة يتكوّن من ١٠ أرقام." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      national_id: input.nationalId.trim(),
      license_number: input.licenseNumber.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    // The database rejects a duplicate id outright; say so rather than
    // showing the raw constraint name.
    if (error.message?.includes("profiles_national_id_format")) {
      return { error: "رقم الهوية أو الإقامة يتكوّن من ١٠ أرقام." };
    }
    console.error("[documents] save failed", error);
    return { error: "تعذّر حفظ البيانات الآن." };
  }
  return {};
}

/**
 * Picks a photo and uploads it, replacing any previous file of that kind.
 *
 * A fixed filename per kind means re-uploading overwrites rather than leaving
 * the old document behind — an abandoned copy of someone's ID is exactly the
 * kind of thing that should not accumulate.
 */
export async function pickAndUploadDocument(
  kind: DocumentKind,
): Promise<{ path?: string; error?: string; cancelled?: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: "نحتاج إذن الوصول للصور لرفع المستند." };
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: false,
  });
  if (picked.canceled || !picked.assets?.length) return { cancelled: true };

  const asset = picked.assets[0];
  const extension = (asset.uri.split(".").pop() ?? "jpg").toLowerCase().split("?")[0];
  const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
  const path = `${user.id}/${kind}.${safeExtension}`;

  try {
    // fetch+blob rather than FormData: this runs on web as well as native,
    // and the blob carries the real content type the storage bucket checks.
    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from("customer-documents")
      .upload(path, blob, { upsert: true, contentType: blob.type || "image/jpeg" });

    if (uploadError) {
      console.error("[documents] upload failed", uploadError);
      return { error: "تعذّر رفع الملف. حاول مرة أخرى." };
    }

    // Written as two explicit shapes rather than a computed key: a computed
    // key widens to string and drops the column typing entirely.
    const patch =
      kind === "id" ? { id_document_path: path } : { license_document_path: path };
    const { error: linkError } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id);

    if (linkError) {
      console.error("[documents] link failed", linkError);
      return { error: "رُفع الملف لكن تعذّر ربطه بحسابك." };
    }

    return { path };
  } catch (err) {
    console.error("[documents] upload threw", err);
    return { error: "تعذّر رفع الملف. تحقّق من اتصالك." };
  }
}

/**
 * Asks the server to look at the uploaded documents.
 *
 * The verdict is written server-side; the value returned here is only for
 * showing the customer what happened. "pending" is a pass — it means the
 * automated check is not configured or could not reach its provider, and the
 * operator reviews the documents when confirming the booking.
 */
export async function requestDocumentCheck(): Promise<{
  status?: DocumentCheck;
  note?: string | null;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke("check-customer-documents", {
    body: {},
  });

  if (error) {
    console.error("[documents] check failed", error);
    // Not fatal: the documents are stored either way and the operator still
    // reviews them, so the customer is not blocked by a check that failed.
    return { status: "pending" };
  }

  const res = data as { status?: DocumentCheck; note?: string | null; error?: string } | null;
  if (res?.error) return { error: res.error };
  return { status: res?.status ?? "pending", note: res?.note ?? null };
}
