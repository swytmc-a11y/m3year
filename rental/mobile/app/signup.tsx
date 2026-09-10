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
import { signUpSchema } from "@/lib/validations";
import { fonts, radius } from "@/theme";

const EMAIL_TAKEN_MESSAGE = "هذا البريد الإلكتروني مسجّل مسبقًا. سجّل الدخول به بدلًا من ذلك.";

/**
 * A duplicate email can surface two different ways: GoTrue's own "User
 * already registered" for a byte-identical repeat, or — for a same address
 * submitted in a different letter case, which GoTrue's own unique index
 * does not catch — a rejection from the handle_new_user() trigger instead.
 * A trigger-raised exception during signUp sometimes reaches the client as
 * GoTrue's generic wrapper text rather than the trigger's own message, so
 * that wrapper is treated as the same case here rather than shown as an
 * unexplained failure — nothing else in that trigger can raise.
 */
function isEmailAlreadyRegistered(message: string): boolean {
  return (
    message.includes("already registered") ||
    message.includes("مسجّل مسبقًا") ||
    message.includes("Database error saving new user")
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  async function onSubmit() {
    setError(undefined);
    setFieldErrors({});
    const parsed = signUpSchema.safeParse({ fullName, email, password });
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
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      // No phone here: an email signup has none to offer, and typing a
      // number into a text field is not proof of possessing it — the
      // account is created with phone left unset and earns it later by
      // actually verifying one (see /verify-phone), which is also what the
      // wallet's welcome credit requires.
      options: {
        data: {
          full_name: parsed.data.fullName,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      console.error("[auth] signUp failed", signUpError);
      setError(isEmailAlreadyRegistered(signUpError.message) ? EMAIL_TAKEN_MESSAGE : "تعذّر إنشاء الحساب الآن. حاول مرة أخرى.");
      return;
    }

    // Real email confirmation is required now that SMTP is configured, so a
    // fresh signUp returns no session — the user must click the link
    // Supabase already emailed before they can sign in.
    if (!data.session) {
      setPendingConfirmation(true);
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
          <FadeInView style={{ alignItems: "center", marginBottom: 28, gap: 12 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.xl,
                backgroundColor: t.surface,
                alignItems: "center",
                justifyContent: "center",
                ...t.shadowSm,
              }}
            >
              <LogoMark size={44} />
            </View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: t.text }}>انضم إلى سمو</Text>
          </FadeInView>

          <FadeInView delay={120} style={{ gap: 18, width: "100%", maxWidth: 400, alignSelf: "center" }}>
            {pendingConfirmation ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                    تحقق من بريدك الإلكتروني
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                    أرسلنا رابط تأكيد إلى {email}. افتح بريدك واضغط الرابط لتفعيل حسابك، ثم سجّل دخولك.
                  </Text>
                </View>
                <Button
                  label="الدخول بالبريد الإلكتروني"
                  fullWidth
                  onPress={() => router.replace("/auth-email")}
                />
              </>
            ) : (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                    إنشاء حساب جديد
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                    أنشئ حسابك لتحجز سيارتك في دقيقة. تقدر توثّق رقم جوالك لاحقًا من
                    الإعدادات وتحصل على رصيد ترحيبي في محفظتك.
                  </Text>
                </View>

                <Field
                  label="الاسم"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="اسمك الكامل"
                  autoComplete="name"
                  error={fieldErrors.fullName}
                  style={{ textAlign: "right" }}
                />

                <Field
                  label="البريد الإلكتروني"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={fieldErrors.email}
                  style={{ textAlign: "left" }}
                />

                <Field
                  label="كلمة السر"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  error={fieldErrors.password}
                  style={{ textAlign: "left" }}
                />

                {error ? (
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.danger, textAlign: "right" }}>{error}</Text>
                ) : null}

                <Button label="إنشاء الحساب" fullWidth loading={loading} onPress={onSubmit} />

                <View style={{ flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted }}>لديك حساب بالفعل؟</Text>
                  <Link href="/auth-email" asChild>
                    <Tappable haptic="none">
                      <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: t.primary }}>سجّل الدخول</Text>
                    </Tappable>
                  </Link>
                </View>
              </>
            )}
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
