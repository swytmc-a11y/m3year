"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function revalidateUserSurfaces(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

// Full-account block: sets profiles.is_blocked, which every write-path RLS
// policy across the schema now checks (migration 0021). This does not end
// the user's existing session (no service_role key is used in this project,
// so Supabase Auth-level session revocation isn't available) — it stops
// every meaningful write action (listings, messages, verification requests,
// ratings, reports, etc.) immediately, while the user can still authenticate
// and browse public content.
export async function blockUser(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_blocked: true })
    .eq("id", userId);

  if (error) {
    console.error("[users] block failed", error);
  } else {
    await supabase.rpc("log_audit", {
      p_action: "user.blocked",
      p_entity_type: "profile",
      p_entity_id: userId,
    });
  }

  revalidateUserSurfaces(userId);
}

export async function unblockUser(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_blocked: false })
    .eq("id", userId);

  if (error) {
    console.error("[users] unblock failed", error);
  } else {
    await supabase.rpc("log_audit", {
      p_action: "user.unblocked",
      p_entity_type: "profile",
      p_entity_id: userId,
    });
  }

  revalidateUserSurfaces(userId);
}
