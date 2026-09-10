import { useCallback, useState } from "react";
import { View, Text, ScrollView, Share } from "react-native";
import { useFocusEffect, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Button, Card, IconButton, Skeleton, Tappable, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import {
  fetchReferralSummary,
  referralLink,
  type ReferralSummary,
} from "@/lib/referrals";
import { countAr } from "@/lib/arabic";
import { formatSar } from "@/lib/constants";
import { fonts, radius } from "@/theme";

/** "دعوة واحدة" / "دعوتان" / "3 دعوات" / "11 دعوة". */
const INVITES_NOUN = {
  zero: "لا دعوات",
  one: "دعوة واحدة",
  two: "دعوتان",
  few: "دعوات",
  many: "دعوة",
};

export default function InviteScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const s = await fetchReferralSummary();
        if (active) setSummary(s);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (authLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!session) return <Redirect href="/auth" />;

  const link = summary ? referralLink(summary.code) : "";
  const message = summary
    ? `جرّب تطبيق سمو لتأجير السيارات، وخذ ${formatSar(summary.welcome_bonus)} رصيدًا في محفظتك عند التسجيل:\n${link}`
    : "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>ادعُ صديقًا</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <View style={{ backgroundColor: t.canvas, borderRadius: radius.xl, padding: 24, gap: 10 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: t.onCanvas, textAlign: "right", lineHeight: 34 }}>
            {summary
              ? `ادعُ صديقًا،\nخذ ${formatSar(summary.referrer_bonus)}.`
              : "ادعُ صديقًا"}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.onCanvasMuted, textAlign: "right", lineHeight: 22 }}>
            {summary
              ? `يحصل صديقك على ${formatSar(summary.welcome_bonus)} في محفظته عند تسجيله، وتحصل أنت على ${formatSar(summary.referrer_bonus)}.`
              : ""}
          </Text>
        </View>

        <Card style={{ padding: 20, gap: 12 }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
            رمز الدعوة
          </Text>
          {summary === null ? (
            <Skeleton width="60%" height={38} radius={radius.md} />
          ) : (
            <Tappable
              haptic="light"
              accessibilityRole="button"
              accessibilityLabel="نسخ رمز الدعوة"
              onPress={async () => {
                await Clipboard.setStringAsync(summary.code);
                toast("نُسخ الرمز.", "success");
              }}
            >
              <View
                style={{
                  borderWidth: 1,
                  borderColor: t.border,
                  borderStyle: "dashed",
                  borderRadius: radius.lg,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                {/* Latin letters and digits, so the code is never reshaped
                    by the RTL run around it. */}
                <Text style={{ fontFamily: fonts.numericBold, fontSize: 28, color: t.text, letterSpacing: 4 }}>
                  {summary.code}
                </Text>
              </View>
            </Tappable>
          )}

          <View style={{ flexDirection: "row-reverse", gap: 10 }}>
            <Button
              label="مشاركة الرابط"
              variant="accent"
              disabled={!summary}
              onPress={() => Share.share({ message })}
            />
            <Button
              label="نسخ الرابط"
              variant="secondary"
              disabled={!summary}
              onPress={async () => {
                await Clipboard.setStringAsync(link);
                toast("نُسخ الرابط.", "success");
              }}
            />
          </View>
        </Card>

        <Card style={{ padding: 20, gap: 14 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
            دعواتك
          </Text>
          <View style={{ flexDirection: "row-reverse", gap: 12 }}>
            <Stat
              label="انضموا برابطك"
              value={summary ? countAr(summary.invited, INVITES_NOUN) : "—"}
            />
            <Stat
              label="ما ربحته"
              value={summary ? formatSar(summary.earned) : "—"}
              highlight={(summary?.earned ?? 0) > 0}
            />
          </View>
        </Card>

        <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 19 }}>
          تُضاف المكافأة عند تسجيل صديقك بحساب موثّق برقم جواله. الرصيد يُصرف على حجوزاتك ولا يُحوَّل نقدًا.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: highlight ? t.accentTint : t.surface2,
        borderRadius: radius.lg,
        padding: 14,
        gap: 4,
      }}
    >
      <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.numericBold, fontSize: 16, color: t.text, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}
