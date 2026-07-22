import { View, Text, ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { unregisterPushToken } from "@/lib/push-notifications";
import { colors, fonts } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { session, user, isAdmin, loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 20,
          }}
        >
          <Logo />
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.mutedText,
              textAlign: "center",
              lineHeight: 22,
              maxWidth: 300,
            }}
          >
            سجّل الدخول لإدارة إعلاناتك وطلبات التوثيق وتقييماتك.
          </Text>
          <View style={{ gap: 12, width: "100%", maxWidth: 320 }}>
            <Link href="/auth" asChild>
              <Button label="تسجيل الدخول" fullWidth />
            </Link>
            <Link href="/signup" asChild>
              <Button label="إنشاء حساب" variant="ghost" fullWidth />
            </Link>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  async function signOut() {
    await unregisterPushToken();
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.grid,
        }}
      >
        <Logo size={22} />
        <Button label="تسجيل الخروج" variant="ghost" onPress={signOut} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View
          style={{
            backgroundColor: colors.white,
            borderColor: colors.grid,
            borderWidth: 1,
            borderRadius: 12,
            padding: 20,
            gap: 6,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.heading,
              fontSize: 18,
              color: colors.ink,
              textAlign: "right",
            }}
          >
            {user?.user_metadata?.full_name || "حسابي"}
          </Text>
          {user?.email ? (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.mutedText,
                textAlign: "right",
              }}
            >
              {user.email}
            </Text>
          ) : null}
          {isAdmin ? (
            <View
              style={{
                alignSelf: "flex-end",
                marginTop: 6,
                backgroundColor: "rgba(15,107,102,0.1)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Text
                style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.verify }}
              >
                حساب مدير — لوحة المراجعة عبر الويب
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          <Button
            label="أنشئ إعلانًا"
            fullWidth
            onPress={() => router.push("/my-listings/new")}
          />
          <Button
            label="إعلاناتي"
            variant="ghost"
            fullWidth
            onPress={() => router.push("/my-listings")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
