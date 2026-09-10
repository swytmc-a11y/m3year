import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Field, IconButton, Tappable, useToast } from "@/components/kit";
import { WalletBonusModal } from "@/components/wallet-bonus-modal";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { phoneSchema, whatsappOtpCodeSchema } from "@/lib/validations";
import { sendWhatsAppOtp, verifyAccountPhone } from "@/lib/whatsapp-auth";
import { activateSignupCredit } from "@/lib/referrals";
import { fonts } from "@/theme";

type Step = "phone" | "code";

/**
 * Attaches a verified phone number to the signed-in account.
 *
 * This is NOT the login flow (/auth) — that one has no session yet and
 * either logs into an existing account or starts a new one. This one
 * upgrades the account already signed in, which is what an email-registered
 * customer needs before the wallet will grant the welcome bonus: that
 * credit checks profiles.phone specifically because it is meant to require
 * a real, possessed number, and an email signup never proved one.
 *
 * Reached with ?next=<path> from the wallet screen's banner, so finishing
 * here can return the customer to where they were rather than dropping them
 * on the home screen.
 */
export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [bonusAmount, setBonusAmount] = useState<number | null>(null);

  if (authLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!session) return <Redirect href="/auth" />;

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
    const result = await verifyAccountPhone(normalizedPhone, parsed.data);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    // The credit is granted server-side and checks phone itself, so calling
    // this is what actually turns "phone verified" into "50 riyals in the
    // wallet" for a customer who already had an account.
    const credit = await activateSignupCredit(null);
    if (credit && credit.welcome > 0) {
      setBonusAmount(credit.welcome);
      return; // Navigates once the modal below is dismissed.
    }

    toast("تم توثيق رقم جوالك.", "success");
    router.replace((next as never) ?? "/wallet");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>توثيق رقم الجوال</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 8, gap: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "phone" ? (
            <>
              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                  ما رقم جوالك؟
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                  راح نرسل لك رمز تحقق عبر واتساب لتوثيقه على حسابك.
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
          ) : (
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
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <WalletBonusModal
        visible={bonusAmount != null}
        amount={bonusAmount ?? 0}
        onClose={() => router.replace((next as never) ?? "/wallet")}
      />
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
