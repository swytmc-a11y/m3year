import { z } from "zod";

/** Empty text inputs arrive as "" from FormData; treat them as absent. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const optionalPositiveNumber = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || (!Number.isNaN(Number(v)) && Number(v) > 0), {
      error: `${label} يجب أن يكون رقمًا أكبر من صفر.`,
    })
    .transform((v) => (v === null ? null : Number(v)));

const optionalTimestamp = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), { error: "التاريخ غير صحيح." })
  .transform((v) => (v === null ? null : new Date(v).toISOString()));

export const couponFormSchema = z
  .object({
    // Normalised here as well as in the database check constraint, so a
    // lowercase entry is accepted rather than rejected.
    code: z
      .string()
      .trim()
      .min(3, { error: "الرمز من ٣ إلى ٣٢ حرفًا." })
      .max(32, { error: "الرمز من ٣ إلى ٣٢ حرفًا." })
      .regex(/^[A-Za-z0-9_-]+$/, { error: "الرمز يقبل الحروف الإنجليزية والأرقام فقط." })
      .transform((v) => v.toUpperCase()),
    description: optionalText,
    discount_type: z.enum(["percent", "fixed"], { error: "اختر نوع الخصم." }),
    discount_value: z
      .string()
      .trim()
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        error: "قيمة الخصم يجب أن تكون أكبر من صفر.",
      })
      .transform(Number),
    max_discount: optionalPositiveNumber("الحد الأقصى للخصم"),
    min_total: optionalPositiveNumber("الحد الأدنى للحجز"),
    starts_at: optionalTimestamp,
    ends_at: optionalTimestamp,
    max_redemptions: optionalPositiveNumber("عدد مرات الاستخدام"),
    max_per_customer: z
      .string()
      .trim()
      .transform((v) => (v === "" ? 1 : Number(v)))
      .refine((v) => Number.isInteger(v) && v > 0, {
        error: "عدد مرات الاستخدام لكل عميل يجب أن يكون رقمًا صحيحًا موجبًا.",
      }),
    is_active: z
      .union([z.string(), z.null()])
      .transform((v) => v === "on" || v === "true"),
  })
  .refine((v) => v.discount_type !== "percent" || v.discount_value <= 100, {
    error: "نسبة الخصم لا تتجاوز ١٠٠٪.",
    path: ["discount_value"],
  })
  .refine((v) => !v.starts_at || !v.ends_at || v.ends_at > v.starts_at, {
    error: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.",
    path: ["ends_at"],
  });

export type CouponFormValues = z.infer<typeof couponFormSchema>;
