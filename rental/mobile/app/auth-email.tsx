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
import { signInSchema } from "@/lib/validations";
import { fonts, radius } from "@/theme";

export default function AuthEmailScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(undefined);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);

    if (signInError) {
      console.error("[auth] signInWithPassword failed", signInError);
      setError(
        signInError.message.includes("Email not confirmed")
          ? "لم تُفعّل بريدك الإلكتروني بعد. تحقق من صندوق الوارد واضغط رابط التأكيد."
          : "البريد الإلكتروني أو كلمة السر غير صحيحة.",
      );
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
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 28, color: t.text }}>سمو</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center" }}>
              تأجير سيارات بسعر واضح
            </Text>
          </FadeInView>

          <FadeInView delay={120} style={{ gap: 20, width: "100%", maxWidth: 400, alignSelf: "center" }}>
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                أهلًا بعودتك
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                سجّل دخولك لمتابعة حجوزاتك.
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
              returnKeyType="next"
              style={{ textAlign: "left" }}
            />

            <Field
              label="كلمة السر"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              style={{ textAlign: "left" }}
            />

            {error ? (
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.danger, textAlign: "right" }}>{error}</Text>
            ) : null}

            <Button label="تسجيل الدخول" fullWidth loading={loading} onPress={onSubmit} />

            <Link href="/forgot-password" asChild>
              <Tappable haptic="none">
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "center" }}>
                  نسيت كلمة السر؟
                </Text>
              </Tappable>
            </Link>
          </FadeInView>

          <FadeInView delay={220} style={{ alignItems: "center", marginTop: 28, gap: 12 }}>
            <Link href="/auth" asChild>
              <Tappable haptic="none">
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: t.primary }}>الدخول برقم الجوال</Text>
              </Tappable>
            </Link>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
