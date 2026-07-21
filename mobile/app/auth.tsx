import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button, Field, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { phoneSchema } from "@/lib/validations";
import { colors, fonts } from "@/theme";

export default function AuthScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(undefined);
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: parsed.data,
    });
    setLoading(false);

    if (otpError) {
      console.error("[auth] signInWithOtp failed", otpError);
      setError("تعذّر إرسال رمز التحقق الآن. حاول مرة أخرى بعد قليل.");
      return;
    }

    router.push({ pathname: "/verify", params: { phone: parsed.data } });
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
              أدخل رقم جوالك وسنرسل لك رمز تحقق عبر رسالة نصية.
            </Text>
          </View>

          <Field
            label="رقم الجوال"
            value={phone}
            onChangeText={setPhone}
            placeholder="05xxxxxxxx"
            keyboardType="phone-pad"
            autoComplete="tel"
            error={error}
            style={{ fontFamily: fonts.mono, textAlign: "left" }}
          />

          <Button label="إرسال رمز التحقق" loading={loading} onPress={onSubmit} />
        </Card>

        <Link href="/demo" asChild>
          <Pressable>
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 14,
                color: colors.verify,
              }}
            >
              أو جرّب المنصة بحساب تجريبي ←
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
