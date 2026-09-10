"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { carFormSchema, carPrivateSchema } from "@/lib/validations/car";
import type { ActionState } from "@/lib/action-state";

function parseCarForm(formData: FormData) {
  return carFormSchema.safeParse({
    branch_id: formData.get("branch_id"),
    make: formData.get("make"),
    model: formData.get("model"),
    year: formData.get("year"),
    category: formData.get("category"),
    transmission: formData.get("transmission"),
    fuel: formData.get("fuel"),
    seats: formData.get("seats"),
    doors: formData.get("doors"),
    color: formData.get("color"),
    quantity: formData.get("quantity") || "1",
    daily_price: formData.get("daily_price"),
    weekly_price: formData.get("weekly_price"),
    monthly_price: formData.get("monthly_price"),
    daily_km_limit: formData.get("daily_km_limit"),
    extra_km_fee: formData.get("extra_km_fee"),
    min_rental_days: formData.get("min_rental_days") || "1",
    max_rental_days: formData.get("max_rental_days"),
    features: formData.get("features") ?? "",
    description: formData.get("description"),
    images: formData.get("images") ?? "",
    status: formData.get("status"),
    confirmation_mode: formData.get("confirmation_mode"),
    sort_order: formData.get("sort_order") || 0,
  });
}

function parsePrivateForm(formData: FormData) {
  return carPrivateSchema.safeParse({
    plate_number: formData.get("plate_number"),
    vin: formData.get("vin"),
    registration_expiry: formData.get("registration_expiry"),
    insurance_expiry: formData.get("insurance_expiry"),
    insurance_policy_no: formData.get("insurance_policy_no"),
    odometer_km: formData.get("odometer_km"),
    notes: formData.get("notes"),
  });
}

/**
 * Add-on prices arrive as `addon_price_<uuid>` plus `addon_on_<uuid>`, so a
 * price can be kept on file while the add-on itself is switched off for
 * this car.
 */
function parseAddonPrices(formData: FormData) {
  const rows: { addon_id: string; price: number; is_available: boolean }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("addon_price_")) continue;
    const addonId = key.slice("addon_price_".length);
    const raw = String(value).trim();
    if (raw === "") continue;
    const price = Number(raw);
    if (Number.isNaN(price) || price < 0) continue;
    rows.push({
      addon_id: addonId,
      price,
      is_available: formData.get(`addon_on_${addonId}`) === "on",
    });
  }
  return rows;
}

function revalidateCarSurfaces(carId?: string) {
  revalidatePath("/admin/cars");
  revalidatePath("/admin");
  revalidatePath("/");
  if (carId) revalidatePath(`/admin/cars/${carId}/edit`);
}

async function saveSideTables(carId: string, formData: FormData) {
  const supabase = await createClient();

  const priv = parsePrivateForm(formData);
  if (priv.success) {
    const hasAny = Object.values(priv.data).some((v) => v !== null);
    if (hasAny) {
      await supabase.from("car_private").upsert({ car_id: carId, ...priv.data });
    }
  }

  const addons = parseAddonPrices(formData);
  if (addons.length > 0) {
    await supabase
      .from("car_addons")
      .upsert(addons.map((a) => ({ car_id: carId, ...a })));
  }
  // An add-on with a cleared price is removed rather than left at a stale one.
  const keptIds = addons.map((a) => a.addon_id);
  let del = supabase.from("car_addons").delete().eq("car_id", carId);
  if (keptIds.length > 0) del = del.not("addon_id", "in", `(${keptIds.join(",")})`);
  await del;
}

export async function createCar(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseCarForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { images, ...car } = parsed.data;
  const { data, error } = await supabase
    .from("cars")
    .insert({ ...car, images, cover_image: images[0] ?? null })
    .select("id")
    .single();

  if (error) {
    console.error("[cars] create failed", error);
    return { error: "تعذّر إضافة السيارة الآن. حاول مرة أخرى." };
  }

  await saveSideTables(data.id, formData);
  await supabase.rpc("log_audit", {
    p_action: "car.created",
    p_entity_type: "car",
    p_entity_id: data.id,
  });

  revalidateCarSurfaces();
  redirect("/admin/cars");
}

export async function updateCar(
  carId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseCarForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { images, ...car } = parsed.data;
  const { error } = await supabase
    .from("cars")
    .update({ ...car, images, cover_image: images[0] ?? null })
    .eq("id", carId);

  if (error) {
    console.error("[cars] update failed", error);
    return { error: "تعذّر تحديث السيارة الآن. حاول مرة أخرى." };
  }

  await saveSideTables(carId, formData);
  await supabase.rpc("log_audit", {
    p_action: "car.updated",
    p_entity_type: "car",
    p_entity_id: carId,
  });

  revalidateCarSurfaces(carId);
  redirect("/admin/cars");
}

export async function setCarStatus(formData: FormData) {
  await requireAdmin();
  const carId = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["draft", "available", "maintenance", "hidden"].includes(status)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("cars")
    .update({ status: status as "draft" | "available" | "maintenance" | "hidden" })
    .eq("id", carId);

  if (error) {
    console.error("[cars] status change failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: "car.status_changed",
    p_entity_type: "car",
    p_entity_id: carId,
    p_metadata: { status },
  });

  revalidateCarSurfaces(carId);
}

/**
 * The list page's quick +/- stepper — a fast way to correct the fleet count
 * (a unit pulled in for repair, one added, a recount) without opening the
 * full edit form. `delta` is `-1` or `1`; the clamp at 0 lives here rather
 * than relying only on the `cars_quantity_non_negative` check, so a
 * double-click at zero fails silently instead of round-tripping a
 * constraint-violation error.
 */
export async function adjustCarQuantity(formData: FormData) {
  await requireAdmin();
  const carId = String(formData.get("id"));
  const delta = Number(formData.get("delta"));
  if (delta !== 1 && delta !== -1) return;

  const supabase = await createClient();
  const { data: current } = await supabase.from("cars").select("quantity").eq("id", carId).single();
  if (!current) return;

  const next = Math.max(0, current.quantity + delta);
  if (next === current.quantity) return;

  const { error } = await supabase.from("cars").update({ quantity: next }).eq("id", carId);
  if (error) {
    console.error("[cars] quantity change failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: "car.quantity_changed",
    p_entity_type: "car",
    p_entity_id: carId,
    p_metadata: { from: current.quantity, to: next },
  });

  revalidateCarSurfaces(carId);
}

/**
 * Refuses to delete a car that has ever been booked — bookings reference it
 * ON DELETE RESTRICT, and a rental record must stay intact. Hiding is the
 * right move for a car leaving the fleet.
 */
export async function deleteCar(formData: FormData) {
  await requireAdmin();
  const carId = String(formData.get("id"));

  const supabase = await createClient();
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("car_id", carId);

  if ((count ?? 0) > 0) {
    await supabase.from("cars").update({ status: "hidden" }).eq("id", carId);
    await supabase.rpc("log_audit", {
      p_action: "car.hidden_instead_of_deleted",
      p_entity_type: "car",
      p_entity_id: carId,
      p_metadata: { bookings: count },
    });
    revalidateCarSurfaces();
    return;
  }

  const { error } = await supabase.from("cars").delete().eq("id", carId);
  if (error) {
    console.error("[cars] delete failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: "car.deleted",
    p_entity_type: "car",
    p_entity_id: carId,
  });

  revalidateCarSurfaces();
}

/** Maintenance/unavailability window, refused if it collides with a booking. */
export async function blockCarDates(
  carId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const start = String(formData.get("start_date") ?? "");
  const end = String(formData.get("end_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!start || !end || end <= start) {
    return { error: "أدخل فترة صحيحة (تاريخ النهاية بعد البداية)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("car_blocks")
    .insert({ car_id: carId, start_date: start, end_date: end, reason });

  if (error) {
    console.error("[cars] block failed", error);
    return {
      error:
        error.message.includes("car_has_bookings_in_range") ||
        error.message.includes("exclusion")
          ? "توجد حجوزات قائمة في هذه الفترة — لا يمكن حجبها."
          : "تعذّر حجب الفترة الآن.",
    };
  }

  revalidateCarSurfaces(carId);
  return { success: true };
}

export async function unblockCarDates(formData: FormData) {
  await requireAdmin();
  const blockId = String(formData.get("id"));
  const carId = String(formData.get("car_id"));

  const supabase = await createClient();
  await supabase.from("car_blocks").delete().eq("id", blockId);
  revalidateCarSurfaces(carId);
}
