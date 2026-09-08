import { useCallback, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { Link, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Logo } from "@/components/logo";
import {
  Button,
  Card,
  IconButton,
  MenuCard,
  ProgressSteps,
  StatCard,
  Tappable,
  useRefreshTint,
  useTabBarSpacing,
  useToast,
} from "@/components/kit";
import {
  CalculatorIcon,
  CompareIcon,
  DocumentIcon,
  EditIcon,
  HeartIcon,
  HelpIcon,
  InfoIcon,
  ListIcon,
  LogoutIcon,
  SettingsIcon,
  ShieldIcon,
} from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { unregisterPushToken } from "@/lib/push-notifications";
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const tabSpacing = useTabBarSpacing();
  const refreshTint = useRefreshTint();
  const { session, user, isAdmin, loading } = useAuth();
  const toast = useToast();
  const [isActiveAccountant, setIsActiveAccountant] = useState(false);
  const [stats, setStats] = useState({ ads: 0, verified: 0, favorites: 0, rating: 0 });
  const [pendingVerification, setPendingVerification] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);

  // "لوحة المحاسب" must only appear for users who are actually an active,
  // approved accountant — not every signed-in user.
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

  const loadStats = useCallback(async () => {
    if (!user) return;
    const [
      listingsRes,
      franchisesRes,
      verifiedListingsRes,
      verifiedFranchisesRes,
      favoritesRes,
      rating,
      verificationRes,
    ] = await Promise.all([
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
      supabase.from("favorites").select("listing_id", { count: "exact", head: true }).eq("user_id", user.id),
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
    setStats({
      ads: (listingsRes.count ?? 0) + (franchisesRes.count ?? 0),
      verified: (verifiedListingsRes.count ?? 0) + (verifiedFranchisesRes.count ?? 0),
      favorites: favoritesRes.count ?? 0,
      rating: rating.average,
    });
    setPendingVerification(verificationRes.data?.status ?? null);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (user) void loadStats().then(() => active);
      return () => {
        active = false;
      };
    }, [loadStats, user?.id]),
  );

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 20 }}>
          <Logo />
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: t.textMuted,
              textAlign: "center",
              lineHeight: 21,
              maxWidth: 300,
            }}
          >
            سجّل الدخول لإدارة إعلاناتك وطلبات التوثيق وتقييماتك.
          </Text>
          <View style={{ gap: 12, width: "100%", maxWidth: 320 }}>
            <Link href="/auth" asChild>
              <Button label="تسجيل الدخول أو إنشاء حساب" fullWidth />
            </Link>
          </View>
          <View style={{ flexDirection: "row-reverse", gap: 16 }}>
            <Link href="/legal/terms">
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted }}>الشروط والأحكام</Text>
            </Link>
            <Link href="/legal/privacy">
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted }}>سياسة الخصوصية</Text>
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

  async function onRefresh() {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }

  async function onResendConfirmation() {
    if (!user?.email || resendingConfirmation) return;
    setResendingConfirmation(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    setResendingConfirmation(false);
    toast(
      error ? "تعذّر إرسال رابط التأكيد الآن." : "أُرسل رابط تأكيد جديد إلى بريدك.",
      error ? "error" : "success",
    );
  }

  const fullName = user?.user_metadata?.full_name || "حسابي";
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;
  const emailUnconfirmed = Boolean(user?.email) && !user?.email_confirmed_at;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <Logo size={20} />
        <IconButton accessibilityLabel="تسجيل الخروج" onPress={signOut}>
          <LogoutIcon color={t.textMuted} size={16} />
        </IconButton>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 18, paddingTop: 4, paddingBottom: tabSpacing, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshTint} />}
      >
        {/* Identity: portrait above the name, with editing right beside it. */}
        <Card style={{ padding: 18, alignItems: "center", gap: 10 }}>
          <Tappable onPress={() => router.push("/settings")} haptic="light" accessibilityLabel="تعديل الصورة الشخصية">
            <View style={{ position: "relative" }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: t.surface2,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: t.border,
                }}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: 72, height: 72 }} contentFit="cover" />
                ) : (
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, color: t.textMuted }}>
                    {initialsOf(fullName)}
                  </Text>
                )}
              </View>
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  left: -2,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: t.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: t.surface,
                }}
              >
                <EditIcon color={t.onPrimary} size={12} />
              </View>
            </View>
          </Tappable>

          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15.5, color: t.text, textAlign: "center" }}>
              {fullName}
            </Text>
            {user?.email ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted }}>{user.email}</Text>
            ) : null}
          </View>

          <Button label="تعديل الملف الشخصي" variant="secondary" onPress={() => router.push("/settings")} />

          {isAdmin ? (
            <View
              style={{
                backgroundColor: t.successTint,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: radius.pill,
              }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10.5, color: t.success }}>
                حساب مدير — لوحة المراجعة عبر الويب
              </Text>
            </View>
          ) : null}
        </Card>

        {emailUnconfirmed ? (
          <Card style={{ padding: 14, gap: 8 }}>
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 12.5, color: t.text }}>
                بريدك الإلكتروني غير مفعّل
              </Text>
              <Tappable haptic="light" onPress={onResendConfirmation} disabled={resendingConfirmation}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 11.5, color: t.primary }}>
                  {resendingConfirmation ? "جارٍ الإرسال..." : "إعادة إرسال الرابط"}
                </Text>
              </Tappable>
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 18 }}>
              أرسلنا رابط تأكيد إلى {user?.email}. فعّله أي وقت — تصفّحك واستخدامك للتطبيق لا يتأثر بذلك.
            </Text>
          </Card>
        ) : null}

        <View style={{ flexDirection: "row", gap: 9 }}>
          <StatCard value={String(stats.ads)} label="إعلاناتي" />
          <StatCard value={stats.rating > 0 ? stats.rating.toFixed(1) : "—"} label="تقييمي" tone="primary" />
          <StatCard value={String(stats.verified)} label="موثّقة" />
          <StatCard value={String(stats.favorites)} label="المفضلة" />
        </View>

        {pendingVerification ? (
          <Card style={{ padding: 14, gap: 11 }}>
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 12.5, color: t.text }}>حالة التوثيق</Text>
              <Text style={{ fontFamily: fonts.numeric, fontSize: 10, color: t.primary }}>قيد المراجعة</Text>
            </View>
            <ProgressSteps steps={VERIFICATION_STEPS} currentIndex={verificationStepIndex(pendingVerification)} />
          </Card>
        ) : null}

        <View style={{ gap: 8 }}>
          <SectionLabel>نشاطي</SectionLabel>
          <MenuCard
            items={[
              {
                label: "إعلاناتي",
                icon: <ListIcon color={t.textMuted} size={15} />,
                value: stats.ads > 0 ? String(stats.ads) : undefined,
                onPress: () => router.push("/my-ads"),
              },
              {
                label: "المفضلة",
                icon: <HeartIcon color={t.textMuted} size={15} />,
                value: stats.favorites > 0 ? String(stats.favorites) : undefined,
                onPress: () => router.push("/favorites"),
              },
              {
                label: "مقارنة الفرص",
                icon: <CompareIcon color={t.textMuted} size={15} />,
                onPress: () => router.push("/compare"),
              },
              ...(isActiveAccountant
                ? [
                    {
                      label: "لوحة المحاسب",
                      icon: <CalculatorIcon color={t.textMuted} size={15} />,
                      onPress: () => router.push("/accountant"),
                    },
                  ]
                : []),
            ]}
          />
        </View>

        <View style={{ gap: 8 }}>
          <SectionLabel>الحساب والدعم</SectionLabel>
          <MenuCard
            items={[
              { label: "الإعدادات", icon: <SettingsIcon color={t.textMuted} size={15} />, onPress: () => router.push("/settings") },
              { label: "الأسئلة الشائعة", icon: <HelpIcon color={t.textMuted} size={15} />, onPress: () => router.push("/faq") },
              { label: "حول التطبيق", icon: <InfoIcon color={t.textMuted} size={15} />, onPress: () => router.push("/about") },
              {
                label: "الشروط والأحكام",
                icon: <DocumentIcon color={t.textMuted} size={15} />,
                onPress: () => router.push("/legal/terms"),
              },
              {
                label: "سياسة الخصوصية",
                icon: <ShieldIcon color={t.textMuted} size={15} />,
                onPress: () => router.push("/legal/privacy"),
              },
            ]}
          />
        </View>

        <View style={{ gap: 8 }}>
          <MenuCard
            items={[
              {
                label: "تسجيل الخروج",
                icon: <LogoutIcon color={t.danger} size={15} />,
                danger: true,
                onPress: signOut,
              },
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
    <Text style={{ fontFamily: fonts.displayBold, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}>
      {children}
    </Text>
  );
}
