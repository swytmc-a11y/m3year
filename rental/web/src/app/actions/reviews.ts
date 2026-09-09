"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

/**
 * Hides or restores a review. Hiding rather than deleting keeps the record
 * behind a rating the operator may later have to account for, and the
 * aggregate on the car recomputes either way.
 */
export async function setReviewHidden(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const hidden = String(formData.get("hidden") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("reviews").update({ is_hidden: hidden }).eq("id", id);

  if (error) {
    console.error("[reviews] moderation failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: hidden ? "review.hide" : "review.unhide",
    p_entity_type: "review",
    p_entity_id: id,
  });

  revalidatePath("/admin/reviews");
}
