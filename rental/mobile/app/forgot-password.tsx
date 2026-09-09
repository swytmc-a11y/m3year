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
import { supabase } from "@/lib/supabase";
import { forgotPasswordSchema } from "@/lib/validations";
import { fonts, radius } from "@/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError(undefined);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: "smorental://reset-password",
    });
    setLoading(false);

    // Supabase returns no error even for an unknown email — this prevents
    // an attacker from using this form to check which emails have accounts.
    // Showing the same "sent" state regardless keeps that guarantee on our
    // side too.
    if (resetError) {
      console.error("[auth] resetPasswordForEmail failed", resetError);
      setError("تعذّر إرسال رابط إعادة التعيين الآن. حاول مرة أخرى.");
      return;
    }
    setSent(true);
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
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 28, color: t.text }}>سمو</Text>
          </FadeInView>

          <FadeInView delay={120} style={{ gap: 20, width: "100%", maxWidth: 400, alignSelf: "center" }}>
            {sent ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                    تحقق من بريدك الإلكتروني
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                    إن كان {email} مسجّلًا لدينا، وصله رابط لإعادة تعيين كلمة السر.
                  </Text>
                </View>
                <Button label="العودة لتسجيل الدخول" fullWidth onPress={() => router.replace("/auth-email")} />
              </>
            ) : (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                    إعادة تعيين كلمة السر
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                    أدخل بريدك الإلكتروني وسنرسل لك رابطًا لتعيين كلمة سر جديدة.
                  </Text>
                </View>

                <Field
                  label="البريد الإلكتروني"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  style={{ textAlign: "left" }}
                />

                {error ? (
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.danger, textAlign: "right" }}>{error}</Text>
                ) : null}

                <Button label="إرسال رابط إعادة التعيين" fullWidth loading={loading} onPress={onSubmit} />
              </>
            )}

            <Link href="/auth-email" asChild>
              <Tappable haptic="none">
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "center" }}>
                  العودة لتسجيل الدخول
                </Text>
              </Tappable>
            </Link>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
