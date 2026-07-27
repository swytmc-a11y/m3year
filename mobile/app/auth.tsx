import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoMark } from "@/components/logo";
import { FadeInView } from "@/components/motion";
import { Button, Field } from "@/components/ui";
import { phoneSchema, whatsappOtpCodeSchema } from "@/lib/validations";
import { sendWhatsAppOtp, verifyWhatsAppOtp } from "@/lib/whatsapp-auth";
import { colors, fonts } from "@/theme";

type Step = "phone" | "code" | "name";

export default function AuthScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
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
    if (fullName.trim().length < 2) {
      setError("أدخل اسمًا صحيحًا.");
      return;
    }
    setLoading(true);
    const result = await verifyWhatsAppOtp(normalizedPhone, code, fullName.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace("/");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
                borderRadius: 22,
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.grid,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LogoMark size={52} />
            </View>
            <Text style={{ fontFamily: fonts.heading, fontSize: 30, color: colors.ink }}>
              معيار
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: colors.mutedText,
                textAlign: "center",
              }}
            >
              منصة إعلانات وتوثيق فرص الشراكة
            </Text>
          </FadeInView>

          <FadeInView delay={120} style={{ gap: 20, width: "100%", maxWidth: 400, alignSelf: "center" }}>
            {step === "phone" ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.ink, textAlign: "right" }}>
                    الدخول برقم الجوال
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "right", lineHeight: 22 }}>
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
                  style={{ fontFamily: fonts.mono, textAlign: "left" }}
                />

                {error ? <ErrorText text={error} /> : null}

                <Button label="إرسال رمز التحقق" fullWidth loading={loading} onPress={onSendCode} />
              </>
            ) : null}

            {step === "code" ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.ink, textAlign: "right" }}>
                    أدخل رمز التحقق
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "right", lineHeight: 22 }}>
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
                  style={{ fontFamily: fonts.mono, textAlign: "center", fontSize: 22, letterSpacing: 6 }}
                />

                {error ? <ErrorText text={error} /> : null}

                <Button label="تأكيد" fullWidth loading={loading} onPress={onVerifyCode} />

                <View style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 8 }}>
                  <Pressable hitSlop={8} disabled={resendCooldown} onPress={onResend}>
                    <Text
                      style={{
                        fontFamily: fonts.bodyBold,
                        fontSize: 13,
                        color: resendCooldown ? colors.mutedText : colors.verify,
                      }}
                    >
                      {resendCooldown ? "أعد الإرسال بعد قليل" : "إعادة إرسال الرمز"}
                    </Text>
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => setStep("phone")}>
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText }}>
                      تغيير الرقم
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {step === "name" ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.ink, textAlign: "right" }}>
                    أكمل حسابك
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "right", lineHeight: 22 }}>
                    رقمك موثّق. بس خبرنا اسمك ونكمل.
                  </Text>
                </View>

                <Field
                  label="الاسم الكامل"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="اسمك"
                  autoComplete="name"
                  style={{ textAlign: "right" }}
                />

                {error ? <ErrorText text={error} /> : null}

                <Button label="إنشاء الحساب" fullWidth loading={loading} onPress={onCompleteSignup} />
              </>
            ) : null}

            {step === "phone" ? (
              <View
                style={{
                  flexDirection: "row-reverse",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <Link href="/auth-email" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.verify }}>
                      الدخول بالبريد الإلكتروني
                    </Text>
                  </Pressable>
                </Link>
              </View>
            ) : null}
          </FadeInView>

          {step === "phone" ? (
            <FadeInView delay={220} style={{ alignItems: "center", marginTop: 28, gap: 12 }}>
              <Link href="/" asChild>
                <Pressable hitSlop={8}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText }}>
                    تصفّح دون تسجيل الدخول
                  </Text>
                </Pressable>
              </Link>
              <View
                style={{
                  flexDirection: "row-reverse",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.mutedText }}>
                  ليس لديك حساب؟
                </Text>
                <Link href="/signup" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.verify }}>
                      أنشئ حسابًا
                    </Text>
                  </Pressable>
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
  return (
    <Text
      style={{
        fontFamily: fonts.bodyMedium,
        fontSize: 13,
        color: colors.danger,
        textAlign: "right",
      }}
    >
      {text}
    </Text>
  );
}
