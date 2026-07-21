import { supabase } from "@/lib/supabase";

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
