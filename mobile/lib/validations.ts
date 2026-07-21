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
