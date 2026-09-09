import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoMark } from "@/components/logo";
import { FadeInView } from "@/components/motion";
import { Button, Field, Tappable } from "@/components/kit";
import { useTheme } from "@/contexts/theme";
import { completeWhatsAppSignupSchema, phoneSchema, whatsappOtpCodeSchema } from "@/lib/validations";
import { sendWhatsAppOtp, verifyWhatsAppOtp } from "@/lib/whatsapp-auth";
import { fonts, radius } from "@/theme";

type Step = "phone" | "code" | "name";

export default function AuthScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);

  async function onSendCode() {
    setError(undefined);
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error: sendError } = await sendWhatsAppOtp(parsed.data);
    setLoading(false);
    if (sendError) {
      setError(sendError);
      return;
    }
    setNormalizedPhone(parsed.data);
    setStep("code");
    setResendCooldown(true);
    setTimeout(() => setResendCooldown(false), 60_000);
  }

  async function onResend() {
    if (resendCooldown) return;
    setError(undefined);
    const { error: sendError } = await sendWhatsAppOtp(normalizedPhone);
    if (sendError) {
      setError(sendError);
      return;
    }
    setResendCooldown(true);
    setTimeout(() => setResendCooldown(false), 60_000);
  }

  async function onVerifyCode() {
    setError(undefined);
    const parsed = whatsappOtpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const result = await verifyWhatsAppOtp(normalizedPhone, parsed.data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsName) {
      setStep("name");
      return;
    }
    router.replace("/");
  }

  async function onCompleteSignup() {
    setError(undefined);
    setFieldErrors({});
    const parsed = completeWhatsAppSignupSchema.safeParse({
      fullName,
      email: signupEmail,
      password: signupPassword,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setLoading(true);
    const result = await verifyWhatsAppOtp(normalizedPhone, code, parsed.data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace("/");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeInView style={{ alignItems: "center", marginBottom: 36, gap: 14 }}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: radius.xxl,
                backgroundColor: t.surface,
                alignItems: "center",
                justifyContent: "center",
                ...t.shadowSm,
              }}
            >
              <LogoMark size={52} />
            </View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 28, color: t.text }}>معيار</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center" }}>
              تأجير سيارات بسعر واضح
            </Text>
          </FadeInView>

          <FadeInView delay={120} style={{ gap: 20, width: "100%", maxWidth: 400, alignSelf: "center" }}>
            {step === "phone" ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                    الدخول برقم الجوال
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                    راح نرسل لك رمز تحقق عبر واتساب.
                  </Text>
                </View>

                <Field
                  label="رقم الجوال"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="05xxxxxxxx"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  style={{ fontFamily: fonts.numeric, textAlign: "left" }}
                />

                {error ? <ErrorText text={error} /> : null}

                <Button label="إرسال رمز التحقق" fullWidth loading={loading} onPress={onSendCode} />
              </>
            ) : null}

            {step === "code" ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                    أدخل رمز التحقق
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                    أرسلنا رمزًا مكوّنًا من 4 أرقام عبر واتساب إلى {normalizedPhone}
                  </Text>
                </View>

                <Field
                  label="رمز التحقق"
                  value={code}
                  onChangeText={setCode}
                  placeholder="0000"
                  keyboardType="number-pad"
                  maxLength={4}
                  style={{ fontFamily: fonts.numeric, textAlign: "center", fontSize: 22, letterSpacing: 6 }}
                />

                {error ? <ErrorText text={error} /> : null}

                <Button label="تأكيد" fullWidth loading={loading} onPress={onVerifyCode} />

                <View style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 8 }}>
                  <Tappable haptic="none" disabled={resendCooldown} onPress={onResend}>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 12.5, color: resendCooldown ? t.textMuted : t.primary }}>
                      {resendCooldown ? "أعد الإرسال بعد قليل" : "إعادة إرسال الرمز"}
                    </Text>
                  </Tappable>
                  <Tappable haptic="none" onPress={() => setStep("phone")}>
                    <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted }}>تغيير الرقم</Text>
                  </Tappable>
                </View>
              </>
            ) : null}

            {step === "name" ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                    أكمل حسابك
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                    رقمك موثّق. أكمل بياناتك لإنشاء الحساب.
                  </Text>
                </View>

                <Field
                  label="الاسم الكامل"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="اسمك"
                  autoComplete="name"
                  error={fieldErrors.fullName}
                  style={{ textAlign: "right" }}
                />

                <Field
                  label="البريد الإلكتروني"
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  placeholder="example@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={fieldErrors.email}
                  style={{ textAlign: "left" }}
                />

                <Field
                  label="كلمة السر"
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  error={fieldErrors.password}
                  style={{ textAlign: "left" }}
                />

                {error ? <ErrorText text={error} /> : null}

                <Button label="إنشاء الحساب" fullWidth loading={loading} onPress={onCompleteSignup} />
              </>
            ) : null}

            {step === "phone" ? (
              <View style={{ flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Link href="/auth-email" asChild>
                  <Tappable haptic="none">
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: t.primary }}>الدخول بالبريد الإلكتروني</Text>
                  </Tappable>
                </Link>
              </View>
            ) : null}
          </FadeInView>

          {step === "phone" ? (
            <FadeInView delay={220} style={{ alignItems: "center", marginTop: 28, gap: 12 }}>
              <Link href="/" asChild>
                <Tappable haptic="none">
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted }}>تصفّح دون تسجيل الدخول</Text>
                </Tappable>
              </Link>
              <View style={{ flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 6 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted }}>ليس لديك حساب؟</Text>
                <Link href="/signup" asChild>
                  <Tappable haptic="none">
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 11.5, color: t.primary }}>أنشئ حسابًا</Text>
                  </Tappable>
                </Link>
              </View>
            </FadeInView>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ErrorText({ text }: { text: string }) {
  const { t } = useTheme();
  return (
    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.danger, textAlign: "right" }}>
      {text}
    </Text>
  );
}
