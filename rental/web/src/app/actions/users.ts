"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * A blocked customer keeps browsing but cannot book: the RLS insert policy
 * on bookings checks is_blocked(), so the block holds at the database even
 * if a client tries to bypass the UI.
 */
export async function toggleUserBlocked(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("id"));
  const blocked = formData.get("blocked") === "1";

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_blocked: blocked })
    .eq("id", userId);

  if (error) {
    console.error("[users] block toggle failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: blocked ? "user.blocked" : "user.unblocked",
    p_entity_type: "profile",
    p_entity_id: userId,
  });

  revalidatePath("/admin/users");
}
