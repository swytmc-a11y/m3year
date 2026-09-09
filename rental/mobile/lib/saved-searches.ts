import { supabase } from "@/lib/supabase";
import type { SearchFilters } from "@/lib/search-cars";
import type { Json } from "@/lib/database.types";

export type SavedSearch = {
  id: string;
  name: string;
  filters: SearchFilters;
  notify: boolean;
  created_at: string;
};

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, name, filters, notify, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[saved-searches] load failed", error);
    return [];
  }
  return (data ?? []) as unknown as SavedSearch[];
}

export async function createSavedSearch(
  name: string,
  filters: SearchFilters,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "سجّل الدخول أولًا." };

  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    name: name.trim(),
    filters: filters as unknown as Json,
  });

  if (error) {
    console.error("[saved-searches] create failed", error);
    return { error: "تعذّر حفظ البحث." };
  }
  return {};
}

export async function deleteSavedSearch(id: string): Promise<void> {
  await supabase.from("saved_searches").delete().eq("id", id);
}

export async function setSavedSearchNotify(id: string, notify: boolean): Promise<void> {
  await supabase.from("saved_searches").update({ notify }).eq("id", id);
}
