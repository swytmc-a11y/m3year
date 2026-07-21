import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button, Field, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { otpCodeSchema } from "@/lib/validations";
import { colors, fonts } from "@/theme";

export default function VerifyScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  if (!phone) {
    return <Redirect href="/auth" />;
  }

  async function onSubmit() {
    setError(undefined);
    const parsed = otpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: String(phone),
      token: parsed.data,
      type: "sms",
    });
    setLoading(false);

    if (verifyError) {
      console.error("[auth] verifyOtp failed", verifyError);
      setError("رمز التحقق غير صحيح أو منتهي الصلاحية.");
      return;
    }

    router.replace("/dashboard");
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
              رمز التحقق
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
              أدخل الرمز المرسل إلى{" "}
              <Text style={{ fontFamily: fonts.mono, color: colors.ink }}>
                {String(phone)}
              </Text>
            </Text>
          </View>

          <Field
            label="رمز التحقق"
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            error={error}
            style={{
              fontFamily: fonts.mono,
              textAlign: "center",
              fontSize: 20,
              letterSpacing: 8,
            }}
          />

          <Button label="تأكيد" loading={loading} onPress={onSubmit} />
        </Card>

        <Pressable onPress={() => router.replace("/auth")}>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.mutedText,
            }}
          >
            تغيير رقم الجوال
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
