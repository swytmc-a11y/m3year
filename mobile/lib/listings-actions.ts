import { supabase } from "@/lib/supabase";
import type { ListingFormValues } from "@/lib/validations";

// All mutations run with the user's session; Row Level Security + the guard
// triggers in the database are the real enforcement (owners cannot self-publish
// or self-verify — the DB rejects it regardless of the client).

type Result = { error?: string };

export async function createListing(
  id: string,
  values: ListingFormValues,
  intent: "draft" | "submit",
  photoUrls: string[],
): Promise<Result> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const { error } = await supabase.from("listings").insert({
    id,
    owner_id: user.id,
    title: values.title,
    sector: values.sector,
    city: values.city,
    monthly_revenue: values.monthly_revenue,
    offered_percentage: values.offered_percentage,
    description: values.description,
    status: intent === "submit" ? "pending_review" : "draft",
    photo_urls: photoUrls,
    has_legal_obligations: values.has_legal_obligations,
    reason_for_selling: values.reason_for_selling,
    financial_data_sharing: values.financial_data_sharing,
  });

  if (error) {
    console.error("[listings] create failed", error);
    return { error: "تعذّر حفظ الإعلان الآن. حاول مرة أخرى." };
  }

  const { error: confidentialError } = await supabase
    .from("listing_confidential")
    .upsert({
      listing_id: id,
      owner_id: user.id,
      entity_type: values.entity_type,
      commercial_registration_number: values.commercial_registration_number,
    });

  if (confidentialError) {
    console.error("[listings] confidential upsert failed", confidentialError);
    return { error: "تعذّر حفظ بيانات السجل التجاري الآن. حاول مرة أخرى." };
  }
  return {};
}

export async function updateListing(
  id: string,
  values: ListingFormValues,
  intent: "draft" | "submit",
  photoUrls: string[],
): Promise<Result> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const { error } = await supabase
    .from("listings")
    .update({
      title: values.title,
      sector: values.sector,
      city: values.city,
      monthly_revenue: values.monthly_revenue,
      offered_percentage: values.offered_percentage,
      description: values.description,
      photo_urls: photoUrls,
      has_legal_obligations: values.has_legal_obligations,
      reason_for_selling: values.reason_for_selling,
      financial_data_sharing: values.financial_data_sharing,
      ...(intent === "submit" ? { status: "pending_review" as const } : {}),
    })
    .eq("id", id);

  if (error) {
    console.error("[listings] update failed", error);
    return { error: "تعذّر تحديث الإعلان الآن. حاول مرة أخرى." };
  }

  const { error: confidentialError } = await supabase
    .from("listing_confidential")
    .upsert({
      listing_id: id,
      owner_id: user.id,
      entity_type: values.entity_type,
      commercial_registration_number: values.commercial_registration_number,
    });

  if (confidentialError) {
    console.error("[listings] confidential upsert failed", confidentialError);
    return { error: "تعذّر حفظ بيانات السجل التجاري الآن. حاول مرة أخرى." };
  }
  return {};
}

export async function submitListingForReview(id: string): Promise<Result> {
  const { error } = await supabase
    .from("listings")
    .update({ status: "pending_review" })
    .eq("id", id);
  if (error) {
    console.error("[listings] submit failed", error);
    return { error: "تعذّر الإرسال للمراجعة الآن." };
  }
  await supabase.rpc("log_audit", {
    p_action: "listing.submitted",
    p_entity_type: "listing",
    p_entity_id: id,
  });
  return {};
}

export async function archiveListing(id: string): Promise<Result> {
  const { error } = await supabase
    .from("listings")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) {
    console.error("[listings] archive failed", error);
    return { error: "تعذّر أرشفة الإعلان الآن." };
  }
  return {};
}
