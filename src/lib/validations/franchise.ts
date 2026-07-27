import { z } from "zod";

const sectorEnum = z.enum(["cafe", "restaurant", "retail", "services", "other"]);
const franchiseTypeEnum = z.enum(["single_unit", "area_development"]);

function optionalNumber(schema: z.ZodNumber) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    return value.trim() === "" ? undefined : Number(value);
  }, schema.optional());
}

export const franchiseFormSchema = z.object({
  brand_name: z
    .string()
    .trim()
    .min(3, { error: "اسم العلامة يجب أن يكون 3 أحرف على الأقل" })
    .max(140, { error: "اسم العلامة يجب ألا يتجاوز 140 حرفًا" }),
  sector: sectorEnum,
  franchise_type: franchiseTypeEnum,
  contract_duration_years: optionalNumber(
    z.number({ error: "أدخل رقمًا" }).int().min(1).max(50),
  ),
  city: z
    .string()
    .trim()
    .min(2, { error: "أدخل اسم المدينة" })
    .max(60, { error: "اسم المدينة طويل جدًا" }),
  description: z
    .string()
    .trim()
    .max(5000, { error: "الوصف طويل جدًا" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  franchise_fee: z.coerce
    .number({ error: "أدخل رسوم الامتياز كرقم" })
    .min(0, { error: "لا يمكن أن تكون سالبة" })
    .max(1_000_000_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  initial_investment_min: optionalNumber(
    z.number({ error: "أدخل رقمًا" }).min(0).max(1_000_000_000),
  ),
  initial_investment_max: optionalNumber(
    z.number({ error: "أدخل رقمًا" }).min(0).max(1_000_000_000),
  ),
  royalty_percentage: optionalNumber(
    z.number({ error: "أدخل رقمًا" }).min(0).max(100),
  ),
  founding_year: optionalNumber(
    z.number({ error: "أدخل رقمًا" }).int().min(1950).max(2100),
  ),
  current_branches_count: optionalNumber(
    z.number({ error: "أدخل رقمًا" }).int().min(0).max(100_000),
  ),
  required_space_sqm: optionalNumber(
    z.number({ error: "أدخل رقمًا" }).min(0).max(1_000_000),
  ),
  required_employees_count: optionalNumber(
    z.number({ error: "أدخل رقمًا" }).int().min(0).max(100_000),
  ),
  expected_payback_months: optionalNumber(
    z.number({ error: "أدخل رقمًا" }).int().min(0).max(1200),
  ),
  training_provided: z
    .union([z.literal("on"), z.literal(null)])
    .optional()
    .transform((value) => value === "on"),
  operational_support: z
    .string()
    .trim()
    .max(2000, { error: "النص طويل جدًا" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  marketing_support: z
    .string()
    .trim()
    .max(2000, { error: "النص طويل جدًا" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type FranchiseFormValues = z.infer<typeof franchiseFormSchema>;

export const franchiseRejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, { error: "اكتب سبب الرفض ليظهر لصاحب الامتياز" })
    .max(1000, { error: "سبب الرفض طويل جدًا" }),
});
