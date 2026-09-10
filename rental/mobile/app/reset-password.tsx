import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogoMarkColor } from "@/components/logo";
import { FadeInView } from "@/components/motion";
import { Button, Field } from "@/components/kit";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { newPasswordSchema } from "@/lib/validations";
import { fonts, radius } from "@/theme";

type SessionState = "checking" | "ready" | "invalid";

// The reset-password link Supabase emails opens this screen via the
// `miyarrental://reset-password` deep link with a recovery access/refresh token in
// the URL. The mobile client has detectSessionInUrl off (there's no browser
// to auto-parse it), so the token has to be pulled out of the incoming URL
// by hand and turned into a session before updateUser({ password }) has
// anything to act on.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    async function establishSessionFromUrl(url: string | null) {
      if (!url) {
        if (active) setSessionState("invalid");
        return;
      }
      const parsed = Linking.parse(url);
      // Supabase's recovery redirect puts the tokens in the URL fragment
      // (#access_token=...&refresh_token=...), which expo-linking exposes
      // through queryParams the same as a normal query string.
      const accessToken = parsed.queryParams?.access_token;
      const refreshToken = parsed.queryParams?.refresh_token;
      if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
        if (active) setSessionState("invalid");
        return;
      }
      const { error: setError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (active) setSessionState(setError ? "invalid" : "ready");
    }

    Linking.getInitialURL().then(establishSessionFromUrl);
    const sub = Linking.addEventListener("url", (event) => establishSessionFromUrl(event.url));

    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  async function onSubmit() {
    setError(undefined);
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (updateError) {
      console.error("[auth] updateUser (password reset) failed", updateError);
      setError("تعذّر تحديث كلمة السر الآن. حاول مرة أخرى.");
      return;
    }
    setDone(true);
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
              <LogoMarkColor size={52} />
            </View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 28, color: t.text }}>سمو</Text>
          </FadeInView>

          <FadeInView delay={120} style={{ gap: 20, width: "100%", maxWidth: 400, alignSelf: "center" }}>
            {sessionState === "checking" ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center" }}>
                جارٍ التحقق من الرابط...
              </Text>
            ) : sessionState === "invalid" ? (
              <>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: t.text, textAlign: "center" }}>
                  الرابط غير صالح أو منتهي الصلاحية
                </Text>
                <Button label="طلب رابط جديد" fullWidth onPress={() => router.replace("/forgot-password")} />
              </>
            ) : done ? (
              <>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, color: t.text, textAlign: "center" }}>
                  تم تحديث كلمة السر بنجاح
                </Text>
                <Button label="الدخول بالبريد الإلكتروني" fullWidth onPress={() => router.replace("/auth-email")} />
              </>
            ) : (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                    كلمة سر جديدة
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                    اختر كلمة سر جديدة لحسابك.
                  </Text>
                </View>

                <Field
                  label="كلمة السر الجديدة"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  style={{ textAlign: "left" }}
                />

                <Field
                  label="تأكيد كلمة السر"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  style={{ textAlign: "left" }}
                />

                {error ? (
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.danger, textAlign: "right" }}>{error}</Text>
                ) : null}

                <Button label="تحديث كلمة السر" fullWidth loading={loading} onPress={onSubmit} />
              </>
            )}
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
