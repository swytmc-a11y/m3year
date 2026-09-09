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

// Authentica's WhatsApp OTP is 4 digits (confirmed against a real send — not
// the 6-digit convention used elsewhere), so it needs its own schema.
export const whatsappOtpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, { error: "أدخل رمز التحقق المكوّن من 4 أرقام" });

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

// Used on the "أكمل حسابك" step of the WhatsApp login flow — the phone is
// already verified by that point, so only name/email/password are collected
// here (no separate phone field, unlike signUpSchema above).
export const completeWhatsAppSignupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "الاسم يجب أن يكون حرفين على الأقل" })
    .max(80, { error: "الاسم طويل جدًا" }),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, { error: "أكّد كلمة السر" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "كلمتا السر غير متطابقتين",
    path: ["confirmPassword"],
  });

export type CompleteWhatsAppSignupValues = z.infer<typeof completeWhatsAppSignupSchema>;

const sectorEnum = z.enum(["cafe", "restaurant", "retail", "services", "other"]);
