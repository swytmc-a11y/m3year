import { useCallback, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Link, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Button, Card, ProgressSteps, StatCard, Tappable } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { unregisterPushToken } from "@/lib/push-notifications";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getUserRatingSummary } from "@/lib/ratings";
import { fonts, radius } from "@/theme";

const VERIFICATION_STEPS = ["إرسال المستندات", "مراجعة المحاسب", "الاعتماد"];

function verificationStepIndex(status: string): number {
  switch (status) {
    case "requested":
      return 0;
    case "assigned":
    case "in_review":
      return 1;
    case "completed":
      return 2;
    default:
      return 0;
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, user, isAdmin, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isActiveAccountant, setIsActiveAccountant] = useState(false);
  const [stats, setStats] = useState({ myListings: 0, verified: 0, rating: 0 });
  const [pendingVerification, setPendingVerification] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (session) getUnreadNotificationCount().then(setUnreadCount);
    }, [session]),
  );

  // "لوحة المحاسب" must only appear for users who are actually an active,
  // approved accountant — not every signed-in user (this was previously
  // shown unconditionally to everyone).
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setIsActiveAccountant(false);
        return;
      }
      let active = true;
      supabase
        .from("accountants")
        .select("is_active")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (active) setIsActiveAccountant(data?.is_active === true);
        });
      return () => {
        active = false;
      };
    }, [user?.id]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      (async () => {
        const [listingsRes, franchisesRes, verifiedListingsRes, verifiedFranchisesRes, rating, verificationRes] =
          await Promise.all([
            supabase.from("listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
            supabase.from("franchises").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
            supabase
              .from("listings")
              .select("id", { count: "exact", head: true })
              .eq("owner_id", user.id)
              .eq("verification_status", "verified"),
            supabase
              .from("franchises")
              .select("id", { count: "exact", head: true })
              .eq("owner_id", user.id)
              .eq("verification_status", "verified"),
            getUserRatingSummary(user.id),
            supabase
              .from("verification_requests")
              .select("status")
              .eq("owner_id", user.id)
              .in("status", ["requested", "assigned", "in_review"])
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);
        if (!active) return;
        setStats({
          myListings: (listingsRes.count ?? 0) + (franchisesRes.count ?? 0),
          verified: (verifiedListingsRes.count ?? 0) + (verifiedFranchisesRes.count ?? 0),
          rating: rating.average,
        });
        setPendingVerification(verificationRes.data?.status ?? null);
      })();
      return () => {
        active = false;
      };
    }, [user?.id]),
  );

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 20 }}>
          <Logo />
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted, textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
            سجّل الدخول لإدارة إعلاناتك وطلبات التوثيق وتقييماتك.
          </Text>
          <View style={{ gap: 12, width: "100%", maxWidth: 320 }}>
            <Link href="/auth" asChild>
              <Button label="تسجيل الدخول أو إنشاء حساب" fullWidth />
            </Link>
          </View>
          <View style={{ flexDirection: "row-reverse", gap: 16 }}>
            <Link href="/legal/terms">
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>الشروط والأحكام</Text>
            </Link>
            <Link href="/legal/privacy">
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>سياسة الخصوصية</Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12 }}>
        <Logo size={20} />
        <Button label="تسجيل الخروج" variant="secondary" onPress={signOut} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 16 }}>
        <Card style={{ padding: 20, gap: 6 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: t.text, textAlign: "right" }}>
            {user?.user_metadata?.full_name || "حسابي"}
          </Text>
          {user?.email ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>{user.email}</Text>
          ) : null}
          {isAdmin ? (
            <View style={{ alignSelf: "flex-end", marginTop: 6, backgroundColor: t.successTint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 11.5, color: t.success }}>
                حساب مدير — لوحة المراجعة عبر الويب
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard value={String(stats.myListings)} label="إعلاناتي" />
          <StatCard value={stats.rating > 0 ? stats.rating.toFixed(1) : "—"} label="تقييمي" tone="primary" />
          <StatCard value={String(stats.verified)} label="موثّقة" />
        </View>

        {pendingVerification ? (
          <Card style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: t.text }}>حالة التوثيق</Text>
              <Text style={{ fontFamily: fonts.numeric, fontSize: 10.5, color: t.primary }}>قيد المراجعة</Text>
            </View>
            <ProgressSteps steps={VERIFICATION_STEPS} currentIndex={verificationStepIndex(pendingVerification)} />
          </Card>
        ) : null}

        <View style={{ gap: 10 }}>
          <SectionLabel>أنشئ عرضًا</SectionLabel>
          <View style={{ flexDirection: "row-reverse", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="إعلان جديد" fullWidth onPress={() => router.push("/my-listings/new")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="امتياز جديد" fullWidth onPress={() => router.push("/my-franchises/new")} />
            </View>
          </View>
          <View style={{ flexDirection: "row-reverse", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="إعلاناتي" variant="secondary" fullWidth onPress={() => router.push("/my-listings")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="امتيازاتي" variant="secondary" fullWidth onPress={() => router.push("/my-franchises")} />
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>نشاطي</SectionLabel>
          <MenuSection
            items={[
              { label: "المفضلة", onPress: () => router.push("/favorites") },
              {
                label: unreadCount > 0 ? `الإشعارات (${unreadCount})` : "الإشعارات",
                onPress: () => router.push("/notifications"),
              },
            ]}
          />
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>الحساب</SectionLabel>
          <MenuSection
            items={[
              { label: "الإعدادات", onPress: () => router.push("/settings") },
              ...(isActiveAccountant ? [{ label: "لوحة المحاسب", onPress: () => router.push("/accountant") }] : []),
            ]}
          />
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>الدعم والمعلومات</SectionLabel>
          <MenuSection
            items={[
              { label: "الأسئلة الشائعة", onPress: () => router.push("/faq") },
              { label: "حول التطبيق", onPress: () => router.push("/about") },
              { label: "الشروط والأحكام", onPress: () => router.push("/legal/terms") },
              { label: "سياسة الخصوصية", onPress: () => router.push("/legal/privacy") },
            ]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { t } = useTheme();
  return (
    <Text style={{ fontFamily: fonts.displayBold, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
      {children}
    </Text>
  );
}

function MenuSection({ items }: { items: { label: string; onPress: () => void }[] }) {
  const { t } = useTheme();
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {items.map((item, idx) => (
        <Tappable key={item.label} onPress={item.onPress} haptic="light">
          <View
            style={{
              flexDirection: "row-reverse",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 18,
              paddingVertical: 15,
              minHeight: 44,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: t.border,
            }}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: t.text }}>{item.label}</Text>
            <ChevronBackIcon color={t.textMuted} size={14} />
          </View>
        </Tappable>
      ))}
    </Card>
  );
}
