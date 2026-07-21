import { View, Text, ScrollView } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { session, user, isAdmin, loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  if (!session) {
    return <Redirect href="/auth" />;
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.grid,
        }}
      >
        <Logo size={22} />
        <Button label="تسجيل الخروج" variant="ghost" onPress={signOut} />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 16,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.heading,
            fontSize: 26,
            color: colors.ink,
            textAlign: "center",
          }}
        >
          أهلاً بك في معيار
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.mutedText,
            textAlign: "center",
            lineHeight: 24,
            maxWidth: 340,
          }}
        >
          {user?.phone
            ? `تم تسجيل دخولك برقم ${user.phone}.`
            : user?.email
              ? `تم تسجيل دخولك بحساب ${user.email}.`
              : "تم تسجيل دخولك."}
          {"\n"}نشر الإعلانات وطلب التوثيق سيتوفران في المراحل القادمة للجوال.
        </Text>

        {isAdmin ? (
          <View
            style={{
              backgroundColor: "rgba(15,107,102,0.1)",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 13,
                color: colors.verify,
              }}
            >
              حساب مدير — لوحة المراجعة قريبًا
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
