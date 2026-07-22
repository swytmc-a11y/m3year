import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button, Field, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { signInSchema } from "@/lib/validations";
import { colors, fonts } from "@/theme";

export default function AuthScreen() {
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
              تسجيل الدخول
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
              أدخل بريدك الإلكتروني وكلمة السر لتسجيل الدخول.
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

          <Button label="تسجيل الدخول" loading={loading} onPress={onSubmit} />
        </Card>

        <Link href="/signup" asChild>
          <Pressable>
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 14,
                color: colors.verify,
              }}
            >
              ليس لديك حساب؟ إنشاء حساب ←
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
