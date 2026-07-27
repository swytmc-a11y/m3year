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
import { supabase } from "@/lib/supabase";
import { signInSchema } from "@/lib/validations";
import { colors, fonts } from "@/theme";

export default function AuthEmailScreen() {
  const router = useRouter();
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
      setError("البريد الإلكتروني أو كلمة السر غير صحيحة.");
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
            <View style={{ gap: 4 }}>
              <Text
                style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.ink, textAlign: "right" }}
              >
                أهلًا بعودتك
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: colors.mutedText,
                  textAlign: "right",
                  lineHeight: 22,
                }}
              >
                سجّل دخولك لمتابعة إعلاناتك ومحادثاتك.
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
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 13,
                  color: colors.danger,
                  textAlign: "right",
                }}
              >
                {error}
              </Text>
            ) : null}

            <Button label="تسجيل الدخول" fullWidth loading={loading} onPress={onSubmit} />

            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText }}>
                ليس لديك حساب؟
              </Text>
              <Link href="/signup" asChild>
                <Pressable hitSlop={8}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.verify }}>
                    أنشئ حسابًا
                  </Text>
                </Pressable>
              </Link>
            </View>
          </FadeInView>

          <FadeInView
            delay={220}
            style={{ alignItems: "center", marginTop: 28, gap: 14 }}
          >
            <Link href="/auth" asChild>
              <Pressable hitSlop={8}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.verify }}>
                  الدخول برقم الجوال
                </Text>
              </Pressable>
            </Link>
            <Link href="/" asChild>
              <Pressable hitSlop={8}>
                <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText }}>
                  تصفّح دون تسجيل الدخول
                </Text>
              </Pressable>
            </Link>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
