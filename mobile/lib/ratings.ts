import { supabase } from "@/lib/supabase";

export type RatingSummary = { average: number; count: number };

export async function getUserRatingSummary(userId: string): Promise<RatingSummary> {
  const { data, error } = await supabase.from("ratings").select("score").eq("rated_id", userId);
  if (error || !data || data.length === 0) return { average: 0, count: 0 };
  const total = data.reduce((sum, r) => sum + r.score, 0);
  return { average: total / data.length, count: data.length };
}

export async function getMyRating(
  ratedId: string,
  listingId: string,
): Promise<{ id: string; score: number; comment: string | null } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("ratings")
    .select("id, score, comment")
    .eq("rater_id", user.id)
    .eq("rated_id", ratedId)
    .eq("listing_id", listingId)
    .maybeSingle();

  return data ?? null;
}

/**
 * Inserts a new rating, or updates the caller's existing one for the same
 * (rated party, listing) pair. RLS requires an existing conversation between
 * rater and rated party, so this only succeeds after real contact happened.
 */
export async function submitRating(params: {
  ratedId: string;
  listingId: string;
  score: number;
  comment: string | null;
}): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };
  if (user.id === params.ratedId) return { error: "لا يمكنك تقييم نفسك." };

  const existing = await getMyRating(params.ratedId, params.listingId);

  if (existing) {
    const { error } = await supabase
      .from("ratings")
      .update({ score: params.score, comment: params.comment })
      .eq("id", existing.id);
    if (error) {
      console.error("[ratings] update failed", error);
      return { error: "تعذّر تحديث التقييم الآن." };
    }
    return {};
  }

  const { error } = await supabase.from("ratings").insert({
    rater_id: user.id,
    rated_id: params.ratedId,
    listing_id: params.listingId,
    score: params.score,
    comment: params.comment,
  });
  if (error) {
    console.error("[ratings] insert failed", error);
    return { error: "تعذّر إرسال التقييم الآن." };
  }
  return {};
}
