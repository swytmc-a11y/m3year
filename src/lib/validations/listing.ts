import { z } from "zod";

const sectorEnum = z.enum([
  "cafe",
  "restaurant",
  "retail",
  "services",
  "other",
]);

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
