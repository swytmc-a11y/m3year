import { z } from "zod";

// Accepts local Saudi format (05XXXXXXXX) or E.164 (+9665XXXXXXXX / 9665XXXXXXXX)
// and normalizes everything to E.164 for Supabase's phone auth.
export const phoneSchema = z
  .string()
  .trim()
  .min(1, { error: "رقم الجوال مطلوب" })
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^(\+?966|0)?5\d{8}$/, {
        error: "أدخل رقم جوال سعودي صحيح، مثل 05xxxxxxxx",
      }),
  )
  .transform((value) => {
    const digits = value.replace(/^\+?966|^0/, "");
    return `+966${digits}`;
  });

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: "أدخل رمز التحقق المكون من 6 أرقام" }),
});
