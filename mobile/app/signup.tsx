import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button, Field, Card } from "@/components/ui";
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
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 32,
        }}
      >
        <Logo />

        <Card style={{ width: "100%", maxWidth: 380, gap: 20 }}>
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: fonts.heading,
                fontSize: 22,
                color: colors.ink,
                textAlign: "right",
              }}
            >
              إنشاء حساب
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
              أدخل بياناتك لإنشاء حساب جديد في معيار.
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
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.amber,
                textAlign: "right",
              }}
            >
              {error}
            </Text>
          ) : null}

          <Button label="إنشاء الحساب" loading={loading} onPress={onSubmit} />
        </Card>

        <Link href="/auth" asChild>
          <Pressable>
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 14,
                color: colors.verify,
              }}
            >
              لديك حساب بالفعل؟ تسجيل الدخول ←
            </Text>
          </Pressable>
        </Link>

        <Link href="/" asChild>
          <Pressable>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: colors.mutedText,
              }}
            >
              العودة للرئيسية
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
