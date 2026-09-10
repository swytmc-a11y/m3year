"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const CURATABLE_SLUGS = ["home.picks", "home.popular", "home.economy"] as const;
export type CuratableSlug = (typeof CURATABLE_SLUGS)[number];

function assertCuratable(slug: string): asserts slug is CuratableSlug {
  if (!CURATABLE_SLUGS.includes(slug as CuratableSlug)) {
    throw new Error(`"${slug}" is not a curatable section`);
  }
}

export async function addCarToBlock(formData: FormData) {
  await requireAdmin();
  const blockSlug = String(formData.get("block_slug"));
  const carId = String(formData.get("car_id") || "");
  assertCuratable(blockSlug);
  if (!carId) return;

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("content_block_cars")
    .select("sort_order")
    .eq("block_slug", blockSlug)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("content_block_cars")
    .insert({ block_slug: blockSlug, car_id: carId, sort_order: (last?.sort_order ?? -1) + 1 });

  if (error) console.error("[curation] add failed", error);
  revalidatePath("/admin/curation");
}

export async function removeCarFromBlock(formData: FormData) {
  await requireAdmin();
  const blockSlug = String(formData.get("block_slug"));
  const carId = String(formData.get("car_id") || "");
  assertCuratable(blockSlug);
  if (!carId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_block_cars")
    .delete()
    .eq("block_slug", blockSlug)
    .eq("car_id", carId);

  if (error) console.error("[curation] remove failed", error);
  revalidatePath("/admin/curation");
}

/** Swaps this car's sort_order with its neighbour in the given direction. */
export async function moveCarInBlock(formData: FormData) {
  await requireAdmin();
  const blockSlug = String(formData.get("block_slug"));
  const carId = String(formData.get("car_id") || "");
  const direction = String(formData.get("direction"));
  assertCuratable(blockSlug);
  if (direction !== "up" && direction !== "down") return;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("content_block_cars")
    .select("car_id, sort_order")
    .eq("block_slug", blockSlug)
    .order("sort_order");
  if (!rows) return;

  const i = rows.findIndex((r) => r.car_id === carId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;

  const a = rows[i];
  const b = rows[j];
  await supabase.from("content_block_cars").update({ sort_order: b.sort_order }).eq("block_slug", blockSlug).eq("car_id", a.car_id);
  await supabase.from("content_block_cars").update({ sort_order: a.sort_order }).eq("block_slug", blockSlug).eq("car_id", b.car_id);
  revalidatePath("/admin/curation");
}
