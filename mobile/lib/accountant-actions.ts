import { supabase } from "@/lib/supabase";

export type VerificationRequestRow = {
  id: string;
  listing_id: string;
  owner_id: string;
  accountant_id: string | null;
  status: "requested" | "assigned" | "in_review" | "completed" | "rejected";
  notes: string | null;
  verified_revenue: number | null;
  fee_amount: number | null;
  created_at: string;
  completed_at: string | null;
  listing_title?: string;
};

async function attachListingTitles(
  rows: VerificationRequestRow[],
): Promise<VerificationRequestRow[]> {
  if (rows.length === 0) return rows;
  const ids = [...new Set(rows.map((r) => r.listing_id))];
  const { data: listings } = await supabase.from("listings").select("id, title").in("id", ids);
  const titleById = new Map((listings ?? []).map((l) => [l.id, l.title]));
  return rows.map((r) => ({ ...r, listing_title: titleById.get(r.listing_id) }));
}

export async function listOpenVerificationRequests(): Promise<{
  data?: VerificationRequestRow[];
  error?: string;
}> {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .is("accountant_id", null)
    .eq("status", "requested")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[accountant] list open failed", error);
    return { error: "تعذّر تحميل الطلبات المفتوحة الآن." };
  }
  return { data: await attachListingTitles(data as VerificationRequestRow[]) };
}

export async function listMyAssignedRequests(): Promise<{
  data?: VerificationRequestRow[];
  error?: string;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("accountant_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[accountant] list assigned failed", error);
    return { error: "تعذّر تحميل طلباتك الآن." };
  }
  return { data: await attachListingTitles(data as VerificationRequestRow[]) };
}

export async function claimVerificationRequest(id: string): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  const { error } = await supabase
    .from("verification_requests")
    .update({ accountant_id: user.id, status: "in_review" })
    .eq("id", id);

  if (error) {
    console.error("[accountant] claim failed", error);
    return { error: "تعذّر استلام الطلب الآن — ربما استلمه محاسب آخر." };
  }
  return {};
}

export async function completeVerification(
  id: string,
  verifiedRevenue: number,
  notes: string | null,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("verification_requests")
    .update({
      status: "completed",
      verified_revenue: verifiedRevenue,
      notes,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[accountant] complete failed", error);
    return { error: "تعذّر إنهاء التوثيق الآن." };
  }
  return {};
}

export async function rejectVerification(
  id: string,
  notes: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("verification_requests")
    .update({ status: "rejected", notes })
    .eq("id", id);

  if (error) {
    console.error("[accountant] reject failed", error);
    return { error: "تعذّر رفض الطلب الآن." };
  }
  return {};
}
