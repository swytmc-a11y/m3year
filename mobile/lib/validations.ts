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
  "retirement",
  "relocation",
  "new_venture",
  "partnership_dispute",
  "financial_distress",
  "other",
]);
export const financialDataSharingEnum = z.enum(["now", "on_request", "none"]);

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
  has_legal_obligations: z.boolean(),
  reason_for_selling: reasonForSellingEnum,
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
});

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
