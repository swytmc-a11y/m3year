import { useCallback, useState } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, MenuCard, Tappable, useTabBarSpacing, useToast } from "@/components/kit";
import { Logo } from "@/components/logo";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { unregisterPushToken } from "@/lib/push-notifications";
import { fonts, radius } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const toast = useToast();
  const { session, user } = useAuth();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  const [fullName, setFullName] = useState<string | null>(null);
  const [activeBookings, setActiveBookings] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      (async () => {
        const [{ data: profile }, { count: live }, { count: all }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .in("status", ["pending_payment", "pending_confirmation", "confirmed", "active"]),
          supabase.from("bookings").select("id", { count: "exact", head: true }),
        ]);
        if (!active) return;
        setFullName(profile?.full_name ?? null);
        setActiveBookings(live ?? 0);
        setTotalBookings(all ?? 0);
      })();
      return () => {
        active = false;
      };
    }, [user?.id]),
  );

  async function onSignOut() {
    await unregisterPushToken();
    await supabase.auth.signOut();
    toast("تم تسجيل الخروج.", "success");
    router.replace("/");
  }

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 920, alignSelf: "center", paddingHorizontal: desktop ? 28 : 18, gap: 18, paddingBottom: tabSpacing }}>
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 16 }}>
            <Logo />
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13.5,
                color: t.textMuted,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              سجّل الدخول لحجز سيارة ومتابعة حجوزاتك.
            </Text>
            <Button label="تسجيل الدخول" onPress={() => router.push("/auth")} />
          </View>

          <MenuCard
            items={[
              { label: "الفروع", onPress: () => router.push("/branches") },
              { label: "الأسئلة الشائعة", onPress: () => router.push("/faq") },
              { label: "عن التطبيق", onPress: () => router.push("/about") },
              { label: "الشروط والأحكام", onPress: () => router.push("/legal/terms") },
              { label: "سياسة الخصوصية", onPress: () => router.push("/legal/privacy") },
            ]}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 980, alignSelf: "center", paddingHorizontal: desktop ? 28 : 18, paddingTop: desktop ? 26 : 18, gap: 18, paddingBottom: tabSpacing }}>
        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: desktop ? 28 : 20, color: t.text }}>حسابي</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted }}>كل تفاصيل رحلتك مع سمو في مكان واحد</Text>
        </View>
        <Card style={{ padding: 20, gap: 16 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: t.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: t.onPrimary }}>
                {(fullName ?? user?.email ?? "?").trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontFamily: fonts.displayBold, fontSize: 16, color: t.text, textAlign: "right" }}
              >
                {fullName || "بلا اسم"}
              </Text>
              {user?.email ? (
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12.5,
                    color: t.textMuted,
                    textAlign: "right",
                    marginTop: 2,
                  }}
                >
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: "row-reverse", gap: 10 }}>
            <Stat label="حجوزات جارية" value={activeBookings} highlight={activeBookings > 0} />
            <Stat label="إجمالي الحجوزات" value={totalBookings} />
          </View>
        </Card>

        <MenuCard
          items={[
            { label: "حجوزاتي", onPress: () => router.push("/my-bookings") },
            { label: "بياناتي ومستنداتي", onPress: () => router.push("/my-details") },
            { label: "المفضلة", onPress: () => router.push("/favorites") },
            { label: "عمليات البحث المحفوظة", onPress: () => router.push("/saved-searches") },
            { label: "الفروع", onPress: () => router.push("/branches") },
          ]}
        />

        <MenuCard
          items={[
            { label: "الإعدادات", onPress: () => router.push("/settings") },
            { label: "الأسئلة الشائعة", onPress: () => router.push("/faq") },
            { label: "الإبلاغ عن مشكلة", onPress: () => router.push("/report-problem") },
            { label: "عن التطبيق", onPress: () => router.push("/about") },
            { label: "الشروط والأحكام", onPress: () => router.push("/legal/terms") },
            { label: "سياسة الخصوصية", onPress: () => router.push("/legal/privacy") },
          ]}
        />

        <Tappable onPress={onSignOut} haptic="light">
          <View
            style={{
              alignItems: "center",
              paddingVertical: 16,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: t.danger }}>
              تسجيل الخروج
            </Text>
          </View>
        </Tappable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: highlight ? `${t.primary}14` : t.surface2,
        borderRadius: radius.lg,
        padding: 14,
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.numericBold,
          fontSize: 20,
          color: highlight ? t.primary : t.text,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted }}>{label}</Text>
    </View>
  );
}
