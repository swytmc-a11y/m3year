import { z } from "zod";

// Accepts local Saudi format (05XXXXXXXX) or E.164 and normalizes to E.164.
export const phoneSchema = z
  .string()
  .trim()
  .min(1, { error: "رقم الجوال مطلوب" })
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(
    z.string().regex(/^(\+?966|0)?5\d{8}$/, {
      error: "أدخل رقم جوال سعودي صحيح، مثل 05xxxxxxxx",
    }),
  )
  .transform((value) => {
    const digits = value.replace(/^\+?966|^0/, "");
    return `+966${digits}`;
  });

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: "أدخل رمز التحقق المكوّن من 6 أرقام" });

// Authentica's WhatsApp OTP is 4 digits (confirmed against a real send — not
// the 6-digit convention used elsewhere), so it needs its own schema.
export const whatsappOtpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, { error: "أدخل رمز التحقق المكوّن من 4 أرقام" });

export const emailSchema = z
  .string()
  .trim()
  .min(1, { error: "البريد الإلكتروني مطلوب" })
  .email({ error: "أدخل بريدًا إلكترونيًا صحيحًا" });

export const passwordSchema = z
  .string()
  .min(6, { error: "كلمة السر يجب أن تكون 6 أحرف على الأقل" });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "كلمة السر مطلوبة" }),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "الاسم يجب أن يكون حرفين على الأقل" })
    .max(80, { error: "الاسم طويل جدًا" }),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;

const sectorEnum = z.enum(["cafe", "restaurant", "retail", "services", "other"]);

export const entityTypeEnum = z.enum(["sole_proprietorship", "company"]);
export const reasonForSellingEnum = z.enum([
  "expansion",
  "development",
  "liquidity_need",
  "new_venture",
  "partnership_dispute",
  "retirement",
  "relocation",
  "other",
]);
export const financialDataSharingEnum = z.enum(["now", "on_request", "none"]);

// Coerces to a number, but treats an empty/blank string as "not provided"
// rather than letting z.coerce.number() turn "" into 0.
function optionalNumber(schema: z.ZodNumber) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value;
    return value.trim() === "" ? undefined : Number(value);
  }, schema.optional());
}

export const listingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "العنوان يجب أن يكون 3 أحرف على الأقل" })
    .max(140, { error: "العنوان يجب ألا يتجاوز 140 حرفًا" }),
  sector: sectorEnum,
  city: z
    .string()
    .trim()
    .min(2, { error: "أدخل اسم المدينة" })
    .max(60, { error: "اسم المدينة طويل جدًا" }),
  monthly_revenue: z.coerce
    .number({ error: "أدخل الإيراد الشهري كرقم" })
    .min(0, { error: "الإيراد الشهري لا يمكن أن يكون سالبًا" })
    .max(1_000_000_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  offered_percentage: z.coerce
    .number({ error: "أدخل النسبة المطروحة كرقم" })
    .gt(0, { error: "النسبة المطروحة يجب أن تكون أكبر من صفر" })
    .max(100, { error: "النسبة المطروحة لا يمكن أن تتجاوز 100٪" }),
  description: z
    .string()
    .trim()
    .max(5000, { error: "الوصف طويل جدًا" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  asking_price: optionalNumber(
    z
      .number({ error: "أدخل السعر المطلوب كرقم" })
      .min(0, { error: "السعر المطلوب لا يمكن أن يكون سالبًا" })
      .max(1_000_000_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  price_negotiable: z.boolean(),
  monthly_profit: optionalNumber(
    z
      .number({ error: "أدخل صافي الربح الشهري كرقم" })
      .min(0, { error: "صافي الربح لا يمكن أن يكون سالبًا" })
      .max(1_000_000_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  show_profit: z.boolean(),
  founding_year: optionalNumber(
    z
      .number({ error: "أدخل سنة التأسيس كرقم" })
      .int()
      .min(1950, { error: "أدخل سنة تأسيس صحيحة" })
      .max(2100, { error: "أدخل سنة تأسيس صحيحة" }),
  ),
  employee_count: optionalNumber(
    z
      .number({ error: "أدخل عدد الموظفين كرقم" })
      .int()
      .min(0, { error: "عدد الموظفين لا يمكن أن يكون سالبًا" })
      .max(100_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  has_legal_obligations: z.boolean(),
  reason_for_selling: reasonForSellingEnum,
  reason_for_selling_other: z
    .string()
    .trim()
    .max(200, { error: "الوصف طويل جدًا" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  financial_data_sharing: financialDataSharingEnum,
  entity_type: entityTypeEnum,
  commercial_registration_number: z
    .string()
    .trim()
    .min(5, { error: "أدخل رقم السجل التجاري كاملًا" })
    .max(20, { error: "رقم السجل التجاري طويل جدًا" }),
  confirm_no_branding: z
    .boolean()
    .refine((value) => value === true, {
      error: "يجب تأكيد خلو الصور من أي شعار أو علامة تجارية قبل المتابعة.",
    }),
}).refine(
  (values) => values.reason_for_selling !== "other" || (values.reason_for_selling_other?.length ?? 0) > 0,
  { error: "اكتب سبب الطرح.", path: ["reason_for_selling_other"] },
);

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export const ratingFormSchema = z.object({
  score: z
    .number({ error: "اختر تقييمًا من 1 إلى 5" })
    .int()
    .min(1, { error: "اختر تقييمًا من 1 إلى 5" })
    .max(5, { error: "التقييم يجب ألا يتجاوز 5" }),
  comment: z
    .string()
    .trim()
    .max(1000, { error: "التعليق طويل جدًا" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type RatingFormValues = z.infer<typeof ratingFormSchema>;

const franchiseTypeEnum = z.enum(["single_unit", "area_development"]);

export const franchiseFormSchema = z.object({
  brand_name: z
    .string()
    .trim()
    .min(3, { error: "اسم العلامة يجب أن يكون 3 أحرف على الأقل" })
    .max(140, { error: "اسم العلامة يجب ألا يتجاوز 140 حرفًا" }),
  sector: sectorEnum,
  franchise_type: franchiseTypeEnum,
  contract_duration_years: optionalNumber(
    z
      .number({ error: "أدخل مدة العقد كرقم" })
      .int()
      .min(1, { error: "أدخل مدة عقد صحيحة" })
      .max(50, { error: "أدخل مدة عقد صحيحة" }),
  ),
  city: z
    .string()
    .trim()
    .min(2, { error: "أدخل اسم المدينة" })
    .max(60, { error: "اسم المدينة طويل جدًا" }),
  cities_available: z.array(z.string().trim().min(1)).default([]),
  countries_available: z.array(z.string().trim().min(1)).default([]),
  description: z
    .string()
    .trim()
    .max(5000, { error: "الوصف طويل جدًا" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  founding_year: optionalNumber(
    z
      .number({ error: "أدخل سنة التأسيس كرقم" })
      .int()
      .min(1950, { error: "أدخل سنة تأسيس صحيحة" })
      .max(2100, { error: "أدخل سنة تأسيس صحيحة" }),
  ),
  current_branches_count: optionalNumber(
    z
      .number({ error: "أدخل عدد الفروع كرقم" })
      .int()
      .min(0, { error: "عدد الفروع لا يمكن أن يكون سالبًا" })
      .max(100_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  franchise_fee: z.coerce
    .number({ error: "أدخل رسوم الامتياز كرقم" })
    .min(0, { error: "رسوم الامتياز لا يمكن أن تكون سالبة" })
    .max(1_000_000_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  initial_investment_min: optionalNumber(
    z
      .number({ error: "أدخل الحد الأدنى للاستثمار كرقم" })
      .min(0, { error: "لا يمكن أن يكون سالبًا" })
      .max(1_000_000_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  initial_investment_max: optionalNumber(
    z
      .number({ error: "أدخل الحد الأقصى للاستثمار كرقم" })
      .min(0, { error: "لا يمكن أن يكون سالبًا" })
      .max(1_000_000_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  royalty_percentage: optionalNumber(
    z
      .number({ error: "أدخل نسبة الإتاوة كرقم" })
      .min(0, { error: "لا يمكن أن تكون سالبة" })
      .max(100, { error: "لا يمكن أن تتجاوز 100٪" }),
  ),
  required_space_sqm: optionalNumber(
    z
      .number({ error: "أدخل المساحة المطلوبة كرقم" })
      .min(0, { error: "لا يمكن أن تكون سالبة" })
      .max(1_000_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  required_employees_count: optionalNumber(
    z
      .number({ error: "أدخل عدد الموظفين المطلوب كرقم" })
      .int()
      .min(0, { error: "لا يمكن أن يكون سالبًا" })
      .max(100_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  expected_payback_months: optionalNumber(
    z
      .number({ error: "أدخل مدة استرداد رأس المال كرقم" })
      .int()
      .min(0, { error: "لا يمكن أن تكون سالبة" })
      .max(1200, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  training_provided: z.boolean(),
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
  entity_type: entityTypeEnum,
  commercial_registration_number: z
    .string()
    .trim()
    .min(5, { error: "أدخل رقم السجل التجاري كاملًا" })
    .max(20, { error: "رقم السجل التجاري طويل جدًا" }),
  confirm_no_branding: z
    .boolean()
    .refine((value) => value === true, {
      error: "يجب تأكيد خلو الصور من أي شعار أو علامة تجارية قبل المتابعة.",
    }),
});

export type FranchiseFormValues = z.infer<typeof franchiseFormSchema>;
