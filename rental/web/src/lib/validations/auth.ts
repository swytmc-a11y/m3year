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

export const emailSchema = z
  .string()
  .trim()
  .min(1, { error: "البريد الإلكتروني مطلوب" })
  .email({ error: "أدخل بريدًا إلكترونيًا صحيحًا" });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "كلمة السر مطلوبة" }),
});

// requestOtpSchema/verifyOtpSchema were dropped along with the unused
// Supabase SMS-OTP server actions. phoneSchema stays: it is the shared
// normalizer for any Saudi number the control panel handles.
