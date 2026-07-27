import { supabase } from "@/lib/supabase";
import type { VerificationRequestRow } from "@/lib/accountant-actions";

export async function getLatestVerificationRequest(
  listingId: string,
): Promise<{ data?: VerificationRequestRow | null; error?: string }> {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[verification] load latest failed", error);
    return { error: "تعذّر تحميل بيانات التوثيق الآن." };
  }
  return { data: data as VerificationRequestRow | null };
}

export async function getLatestFranchiseVerificationRequest(
  franchiseId: string,
): Promise<{ data?: VerificationRequestRow | null; error?: string }> {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("franchise_id", franchiseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[verification] load latest franchise request failed", error);
    return { error: "تعذّر تحميل بيانات التوثيق الآن." };
  }
  return { data: data as VerificationRequestRow | null };
}

export async function setFinancialStatementPath(
  requestId: string,
  path: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("verification_requests")
    .update({ financial_statement_path: path })
    .eq("id", requestId);

  if (error) {
    console.error("[verification] set financial statement failed", error);
    return { error: "تعذّر حفظ القوائم المالية الآن." };
  }
  return {};
}

// RLS + the guard trigger in the database are the real enforcement: the owner
// can only insert a fresh 'requested' row for a listing they own, and only one
// open request may exist per listing at a time.
export async function requestVerification(
  listingId: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const { error } = await supabase.from("verification_requests").insert({
    listing_id: listingId,
    owner_id: user.id,
  });

  if (error) {
    console.error("[verification] request failed", error);
    if (error.code === "23505") {
      return { error: "يوجد طلب توثيق مفتوح بالفعل لهذا الإعلان." };
    }
    return { error: "تعذّر إرسال طلب التوثيق الآن. حاول مرة أخرى." };
  }
  return {};
}

export async function requestFranchiseVerification(
  franchiseId: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const { error } = await supabase.from("verification_requests").insert({
    franchise_id: franchiseId,
    owner_id: user.id,
  });

  if (error) {
    console.error("[verification] franchise request failed", error);
    if (error.code === "23505") {
      return { error: "يوجد طلب توثيق مفتوح بالفعل لهذا الامتياز." };
    }
    return { error: "تعذّر إرسال طلب التوثيق الآن. حاول مرة أخرى." };
  }
  return {};
}
