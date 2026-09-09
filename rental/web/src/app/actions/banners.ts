"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { bannerFormSchema } from "@/lib/validations/banner";
import type { ActionState } from "@/lib/action-state";
import type { TablesInsert } from "@/lib/supabase/database.types";

function parseBannerForm(formData: FormData) {
  return bannerFormSchema.safeParse({
    render: formData.get("render"),
    template: formData.get("template") ?? "",
    tone: formData.get("tone") ?? "",
    figure: formData.get("figure"),
    cta_label: formData.get("cta_label"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    image_url: formData.get("image_url") ?? "",
    target_kind: formData.get("target_kind"),
    target_car_id: formData.get("target_car_id"),
    target_branch_id: formData.get("target_branch_id"),
    target_category: formData.get("target_category"),
    target_coupon_code: formData.get("target_coupon_code"),
    target_url: formData.get("target_url"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    sort_order: formData.get("sort_order") ?? "0",
    is_active: formData.get("is_active"),
  });
}

/**
 * The database trigger clears whatever does not belong to the chosen kind,
 * but sending the stale values anyway would mean an edit that switches a
 * banner from "car" to "url" briefly carries both. Cleared here too.
 */
function forKind(values: ReturnType<typeof bannerFormSchema.parse>): TablesInsert<"promo_banners"> {
  const templated = values.render === "template";
  return {
    render: values.render,
    // The database trigger clears the irrelevant side too, but sending a
    // stale template on an image banner (or the reverse) would briefly make
    // the row describe two different banners at once.
    template: templated
      ? (values.template as TablesInsert<"promo_banners">["template"])
      : null,
    tone: values.tone,
    figure: templated ? values.figure : null,
    cta_label: templated ? values.cta_label : null,
    title: values.title,
    subtitle: values.subtitle,
    image_url: templated ? null : values.image_url,
    target_kind: values.target_kind,
    target_car_id: values.target_kind === "car" ? values.target_car_id : null,
    target_branch_id: values.target_kind === "branch" ? values.target_branch_id : null,
    target_category:
      values.target_kind === "category"
        ? (values.target_category as TablesInsert<"promo_banners">["target_category"])
        : null,
    target_coupon_code: values.target_kind === "coupon" ? values.target_coupon_code : null,
    target_url: values.target_kind === "url" ? values.target_url : null,
    starts_at: values.starts_at,
    ends_at: values.ends_at,
    sort_order: values.sort_order,
    is_active: values.is_active,
  };
}

export async function createBanner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parseBannerForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_banners")
    .insert(forKind(parsed.data))
    .select("id")
    .single();

  if (error) {
    console.error("[banners] create failed", error);
    return { error: "تعذّر حفظ البنر الآن." };
  }

  await supabase.rpc("log_audit", {
    p_action: "banner.create",
    p_entity_type: "promo_banner",
    p_entity_id: data.id,
  });

  revalidatePath("/admin/banners");
  redirect("/admin/banners");
}

export async function updateBanner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "البنر غير موجود." };

  const parsed = parseBannerForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("promo_banners").update(forKind(parsed.data)).eq("id", id);

  if (error) {
    console.error("[banners] update failed", error);
    return { error: "تعذّر تحديث البنر الآن." };
  }

  await supabase.rpc("log_audit", {
    p_action: "banner.update",
    p_entity_type: "promo_banner",
    p_entity_id: id,
  });

  revalidatePath("/admin/banners");
  redirect("/admin/banners");
}

export async function toggleBannerActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("promo_banners").update({ is_active: active }).eq("id", id);

  if (error) {
    console.error("[banners] toggle failed", error);
    return;
  }

  revalidatePath("/admin/banners");
}

/**
 * Banners carry no history worth keeping — unlike a coupon, nothing
 * references one after the fact — so this really does delete.
 */
export async function deleteBanner(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("promo_banners").delete().eq("id", id);

  if (error) {
    console.error("[banners] delete failed", error);
    return;
  }

  await supabase.rpc("log_audit", {
    p_action: "banner.delete",
    p_entity_type: "promo_banner",
    p_entity_id: id,
  });

  revalidatePath("/admin/banners");
}
