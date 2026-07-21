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

const sectorEnum = z.enum(["cafe", "restaurant", "retail", "services", "other"]);

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
