import { z } from "zod";

const sectorEnum = z.enum([
  "cafe",
  "restaurant",
  "retail",
  "services",
  "other",
]);

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
  price_negotiable: z
    .union([z.literal("on"), z.literal(null)])
    .optional()
    .transform((value) => value === "on"),
  monthly_profit: optionalNumber(
    z
      .number({ error: "أدخل صافي الربح الشهري كرقم" })
      .min(0, { error: "صافي الربح لا يمكن أن يكون سالبًا" })
      .max(1_000_000_000, { error: "القيمة المدخلة كبيرة جدًا" }),
  ),
  show_profit: z
    .union([z.literal("on"), z.literal(null)])
    .optional()
    .transform((value) => value === "on"),
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
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

// Public search/filter parameters (all optional).
export const listingFilterSchema = z.object({
  q: z.string().trim().max(140).optional(),
  sector: sectorEnum.optional(),
  city: z.string().trim().max(60).optional(),
  verified: z
    .enum(["1", "true", "on"])
    .optional()
    .transform((value) => value !== undefined),
});

export const rejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, { error: "اكتب سبب الرفض ليظهر لصاحب الإعلان" })
    .max(1000, { error: "سبب الرفض طويل جدًا" }),
});
