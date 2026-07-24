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
import { signUpSchema } from "@/lib/validations";
import { colors, fonts } from "@/theme";

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(undefined);
    setFieldErrors({});
    const parsed = signUpSchema.safeParse({ fullName, email, phone, password });
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
    const { error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      console.error("[auth] signUp failed", signUpError);
      setError(
        signUpError.message.includes("already registered")
          ? "هذا البريد الإلكتروني مسجّل مسبقًا."
          : "تعذّر إنشاء الحساب الآن. حاول مرة أخرى.",
      );
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
          <FadeInView style={{ alignItems: "center", marginBottom: 28, gap: 12 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.grid,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LogoMark size={44} />
            </View>
            <Text style={{ fontFamily: fonts.heading, fontSize: 24, color: colors.ink }}>
              انضم إلى معيار
            </Text>
          </FadeInView>

          <FadeInView delay={120} style={{ gap: 18, width: "100%", maxWidth: 400, alignSelf: "center" }}>
            <View style={{ gap: 4 }}>
              <Text
                style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.ink, textAlign: "right" }}
              >
                إنشاء حساب جديد
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
                اعرض مشروعك أو ابحث عن فرصة شراكة موثّقة.
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
              label="رقم الجوال"
              value={phone}
              onChangeText={setPhone}
              placeholder="05xxxxxxxx"
              keyboardType="phone-pad"
              autoComplete="tel"
              error={fieldErrors.phone}
              style={{ fontFamily: fonts.mono, textAlign: "left" }}
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

            <Button label="إنشاء الحساب" fullWidth loading={loading} onPress={onSubmit} />

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
                لديك حساب بالفعل؟
              </Text>
              <Link href="/auth" asChild>
                <Pressable hitSlop={8}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.verify }}>
                    سجّل الدخول
                  </Text>
                </Pressable>
              </Link>
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
