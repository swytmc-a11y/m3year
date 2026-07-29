import { supabase } from "@/lib/supabase";
import type { BusinessSector } from "@/lib/constants";

/**
 * A filter set the user asked to keep, plus an optional alert when something
 * new matches it.
 *
 * Inventory here is sparse and slow-moving, so "nothing matches today" is the
 * common case for a serious investor. Without this they have no reason to
 * come back and no way to be told when the thing they wanted appears.
 */

export type SavedSearch = {
  id: string;
  name: string;
  kind: "listing" | "franchise";
  sector: BusinessSector | null;
  city: string | null;
  min_revenue: number | null;
  max_revenue: number | null;
  verified_only: boolean;
  alerts_enabled: boolean;
  created_at: string;
};

export type NewSavedSearch = {
  name: string;
  kind: "listing" | "franchise";
  sector?: BusinessSector | null;
  city?: string | null;
  minRevenue?: number | null;
  maxRevenue?: number | null;
  verifiedOnly?: boolean;
};

export const SAVED_SEARCH_LIMIT = 20;

export async function listSavedSearches(): Promise<{ data?: SavedSearch[]; error?: string }> {
  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, name, kind, sector, city, min_revenue, max_revenue, verified_only, alerts_enabled, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[saved-searches] list failed", error);
    return { error: "تعذّر تحميل عمليات البحث المحفوظة." };
  }
  return { data: (data ?? []) as SavedSearch[] };
}

export async function createSavedSearch(input: NewSavedSearch): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "سجّل الدخول لحفظ البحث." };

  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    name: input.name.trim(),
    kind: input.kind,
    sector: input.sector ?? null,
    city: input.city ?? null,
    min_revenue: input.minRevenue ?? null,
    max_revenue: input.maxRevenue ?? null,
    verified_only: input.verifiedOnly ?? false,
  });

  if (error) {
    console.error("[saved-searches] create failed", error);
    // The database caps how many a user may keep, since every saved search
    // costs work on every publish.
    if (error.message?.includes("saved_search_limit_reached")) {
      return { error: `يمكنك حفظ ${SAVED_SEARCH_LIMIT} عملية بحث كحد أقصى. احذف واحدة أولًا.` };
    }
    return { error: "تعذّر حفظ البحث الآن." };
  }
  return {};
}

export async function setSavedSearchAlerts(id: string, enabled: boolean): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("saved_searches")
    .update({ alerts_enabled: enabled })
    .eq("id", id);
  if (error) {
    console.error("[saved-searches] toggle alerts failed", error);
    return { error: "تعذّر تحديث التنبيه." };
  }
  return {};
}

export async function deleteSavedSearch(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("saved_searches").delete().eq("id", id);
  if (error) {
    console.error("[saved-searches] delete failed", error);
    return { error: "تعذّر حذف البحث." };
  }
  return {};
}
