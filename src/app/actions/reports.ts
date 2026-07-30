"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// The reports table had RLS letting an admin update it (reports_update_admin)
// since it was first added, but no admin UI ever called that policy — every
// report anyone has ever filed has sat there unseen. This file is the first
// thing that reads and resolves them.

async function setReportStatus(id: string, status: "reviewed" | "dismissed") {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  if (error) {
    console.error("[reports] status update failed", error);
    return;
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function markReportReviewed(formData: FormData) {
  const id = String(formData.get("id"));
  await setReportStatus(id, "reviewed");
}

export async function dismissReport(formData: FormData) {
  const id = String(formData.get("id"));
  await setReportStatus(id, "dismissed");
}
