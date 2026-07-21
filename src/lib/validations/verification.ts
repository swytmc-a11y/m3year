import { z } from "zod";

export const requestVerificationSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(1000, { error: "الملاحظات طويلة جدًا" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export const assignAccountantSchema = z.object({
  accountantId: z.uuid({ error: "اختر محاسبًا" }),
  feeAmount: z.coerce
    .number()
    .min(0, { error: "الرسوم لا يمكن أن تكون سالبة" })
    .optional()
    .nullable(),
});

export const completeVerificationSchema = z.object({
  verifiedRevenue: z.coerce
    .number({ error: "أدخل الإيراد الموثّق كرقم" })
    .min(0, { error: "القيمة لا يمكن أن تكون سالبة" }),
});

export const rejectVerificationSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(3, { error: "اكتب سبب الرفض ليظهر لصاحب الإعلان" })
    .max(1000, { error: "السبب طويل جدًا" }),
});

export const accountantApplicationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "أدخل الاسم الكامل" })
    .max(120, { error: "الاسم طويل جدًا" }),
  socpaNumber: z
    .string()
    .trim()
    .min(2, { error: "أدخل رقم العضوية" })
    .max(60, { error: "رقم العضوية طويل جدًا" }),
  bio: z
    .string()
    .trim()
    .max(2000, { error: "النبذة طويلة جدًا" })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

// Reports must be a PDF under 10MB.
export const MAX_REPORT_SIZE = 10 * 1024 * 1024;
export const ALLOWED_REPORT_TYPE = "application/pdf";
