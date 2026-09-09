import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const optionalTimestamp = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), { error: "التاريخ غير صحيح." })
  .transform((v) => (v === null ? null : new Date(v).toISOString()));

export const bannerFormSchema = z
  .object({
    title: optionalText,
    subtitle: optionalText,
    // The uploader writes a comma-separated list; a banner uses the first.
    image_url: z
      .string()
      .trim()
      .transform((v) => v.split(",")[0]?.trim() ?? "")
      .refine((v) => v.length > 0, { error: "ارفع صورة البنر." }),

    target_kind: z.enum(["none", "car", "branch", "category", "coupon", "url"], {
      error: "اختر وجهة البنر.",
    }),
    target_car_id: optionalText,
    target_branch_id: optionalText,
    target_category: optionalText,
    target_coupon_code: optionalText.transform((v) => (v === null ? null : v.toUpperCase())),
    target_url: optionalText,

    starts_at: optionalTimestamp,
    ends_at: optionalTimestamp,
    sort_order: z
      .string()
      .trim()
      .transform((v) => (v === "" ? 0 : Number(v)))
      .refine((v) => Number.isInteger(v), { error: "الترتيب يجب أن يكون رقمًا صحيحًا." }),
    is_active: z.union([z.string(), z.null()]).transform((v) => v === "on" || v === "true"),
  })
  // Mirrors the database trigger so the operator gets a field error instead
  // of a raw Postgres exception.
  .superRefine((v, ctx) => {
    const need = (field: string, value: unknown, message: string) => {
      if (!value) ctx.addIssue({ code: "custom", path: [field], message });
    };

    if (v.target_kind === "car") need("target_car_id", v.target_car_id, "اختر السيارة.");
    if (v.target_kind === "branch") need("target_branch_id", v.target_branch_id, "اختر الفرع.");
    if (v.target_kind === "category") need("target_category", v.target_category, "اختر الفئة.");
    if (v.target_kind === "coupon")
      need("target_coupon_code", v.target_coupon_code, "أدخل رمز الخصم.");
    if (v.target_kind === "url") {
      if (!v.target_url) {
        ctx.addIssue({ code: "custom", path: ["target_url"], message: "أدخل الرابط." });
      } else if (!/^https:\/\//i.test(v.target_url)) {
        ctx.addIssue({
          code: "custom",
          path: ["target_url"],
          message: "الرابط يجب أن يبدأ بـ https://",
        });
      }
    }
  })
  .refine((v) => !v.starts_at || !v.ends_at || v.ends_at > v.starts_at, {
    error: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.",
    path: ["ends_at"],
  });

export type BannerFormValues = z.infer<typeof bannerFormSchema>;
