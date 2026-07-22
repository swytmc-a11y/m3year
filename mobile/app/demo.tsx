import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/theme";

// TEMPORARY preview-only screen. Remove with the demo accounts before launch.
const DEMO = {
  owner: { email: "owner@miyar.demo", password: "Demo123456" },
  admin: { email: "admin@miyar.demo", password: "Demo123456" },
};

export default function DemoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "owner" | "admin">(null);
  const [error, setError] = useState<string | undefined>();

  async function enter(as: "owner" | "admin") {
    setError(undefined);
    setLoading(as);
    const { error: signInError } = await supabase.auth.signInWithPassword(
      DEMO[as],
    );
    setLoading(null);

    if (signInError) {
      console.error("[auth] demo sign-in failed", signInError);
      setError("تعذّر الدخول التجريبي الآن. حاول مرة أخرى.");
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
          <View style={{ alignItems: "flex-end" }}>
            <View
              style={{
                backgroundColor: "rgba(217,118,43,0.1)",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: radius.pill,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyBold,
                  fontSize: 12,
                  color: colors.amber,
                }}
              >
                دخول تجريبي للمعاينة
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.mutedText,
              textAlign: "right",
              lineHeight: 22,
            }}
          >
            تسجيل الدخول عبر الجوال يُفعّل لاحقًا بمزوّد رسائل نصية. للمعاينة،
            ادخل بحساب تجريبي بضغطة واحدة.
          </Text>

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

          <View style={{ gap: 12 }}>
            <Button
              label="دخول كصاحب مشروع"
              fullWidth
              loading={loading === "owner"}
              onPress={() => enter("owner")}
            />
            <Button
              label="دخول كمدير"
              variant="ghost"
              fullWidth
              loading={loading === "admin"}
              onPress={() => enter("admin")}
            />
          </View>
        </Card>

        <Pressable onPress={() => router.replace("/")}>
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
      </ScrollView>
    </SafeAreaView>
  );
}
