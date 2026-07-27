import { supabase } from "@/lib/supabase";
import type { FranchiseFormValues } from "@/lib/validations";

// All mutations run with the user's session; Row Level Security + the guard
// triggers in the database are the real enforcement (owners cannot self-publish
// or self-verify — the DB rejects it regardless of the client).

type Result = { error?: string };

export async function createFranchise(
  id: string,
  values: FranchiseFormValues,
  intent: "draft" | "submit",
  logoUrl: string | null,
  photoUrls: string[],
): Promise<Result> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const { error } = await supabase.from("franchises").insert({
    id,
    owner_id: user.id,
    brand_name: values.brand_name,
    sector: values.sector,
    franchise_type: values.franchise_type,
    contract_duration_years: values.contract_duration_years ?? null,
    city: values.city,
    cities_available: values.cities_available,
    countries_available: values.countries_available,
    description: values.description,
    status: intent === "submit" ? "pending_review" : "draft",
    logo_url: logoUrl,
    photo_urls: photoUrls,
    founding_year: values.founding_year ?? null,
    current_branches_count: values.current_branches_count ?? null,
    franchise_fee: values.franchise_fee,
    initial_investment_min: values.initial_investment_min ?? null,
    initial_investment_max: values.initial_investment_max ?? null,
    royalty_percentage: values.royalty_percentage ?? null,
    required_space_sqm: values.required_space_sqm ?? null,
    required_employees_count: values.required_employees_count ?? null,
    expected_payback_months: values.expected_payback_months ?? null,
    training_provided: values.training_provided,
    operational_support: values.operational_support,
    marketing_support: values.marketing_support,
  });

  if (error) {
    console.error("[franchises] create failed", error);
    return { error: "تعذّر حفظ الامتياز الآن. حاول مرة أخرى." };
  }

  const { error: confidentialError } = await supabase
    .from("franchise_confidential")
    .upsert({
      franchise_id: id,
      owner_id: user.id,
      entity_type: values.entity_type,
      commercial_registration_number: values.commercial_registration_number,
    });

  if (confidentialError) {
    console.error("[franchises] confidential upsert failed", confidentialError);
    return { error: "تعذّر حفظ بيانات السجل التجاري الآن. حاول مرة أخرى." };
  }
  return {};
}

export async function updateFranchise(
  id: string,
  values: FranchiseFormValues,
  intent: "draft" | "submit",
  logoUrl: string | null,
  photoUrls: string[],
): Promise<Result> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  const { error } = await supabase
    .from("franchises")
    .update({
      brand_name: values.brand_name,
      sector: values.sector,
      franchise_type: values.franchise_type,
      contract_duration_years: values.contract_duration_years ?? null,
      city: values.city,
      cities_available: values.cities_available,
      countries_available: values.countries_available,
      description: values.description,
      logo_url: logoUrl,
      photo_urls: photoUrls,
      founding_year: values.founding_year ?? null,
      current_branches_count: values.current_branches_count ?? null,
      franchise_fee: values.franchise_fee,
      initial_investment_min: values.initial_investment_min ?? null,
      initial_investment_max: values.initial_investment_max ?? null,
      royalty_percentage: values.royalty_percentage ?? null,
      required_space_sqm: values.required_space_sqm ?? null,
      required_employees_count: values.required_employees_count ?? null,
      expected_payback_months: values.expected_payback_months ?? null,
      training_provided: values.training_provided,
      operational_support: values.operational_support,
      marketing_support: values.marketing_support,
      ...(intent === "submit" ? { status: "pending_review" as const } : {}),
    })
    .eq("id", id);

  if (error) {
    console.error("[franchises] update failed", error);
    return { error: "تعذّر تحديث الامتياز الآن. حاول مرة أخرى." };
  }

  const { error: confidentialError } = await supabase
    .from("franchise_confidential")
    .upsert({
      franchise_id: id,
      owner_id: user.id,
      entity_type: values.entity_type,
      commercial_registration_number: values.commercial_registration_number,
    });

  if (confidentialError) {
    console.error("[franchises] confidential upsert failed", confidentialError);
    return { error: "تعذّر حفظ بيانات السجل التجاري الآن. حاول مرة أخرى." };
  }
  return {};
}

export async function submitFranchiseForReview(id: string): Promise<Result> {
  const { error } = await supabase
    .from("franchises")
    .update({ status: "pending_review" })
    .eq("id", id);
  if (error) {
    console.error("[franchises] submit failed", error);
    return { error: "تعذّر الإرسال للمراجعة الآن." };
  }
  await supabase.rpc("log_audit", {
    p_action: "franchise.submitted",
    p_entity_type: "franchise",
    p_entity_id: id,
  });
  return {};
}

export async function archiveFranchise(id: string): Promise<Result> {
  const { error } = await supabase
    .from("franchises")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) {
    console.error("[franchises] archive failed", error);
    return { error: "تعذّر أرشفة الامتياز الآن." };
  }
  return {};
}
