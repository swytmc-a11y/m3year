import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, IconButton, Tappable } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import {
  listOpenVerificationRequests,
  listMyAssignedRequests,
  type VerificationRequestRow,
} from "@/lib/accountant-actions";
import { fonts } from "@/theme";

const STATUS_LABEL: Record<string, string> = {
  requested: "بانتظار محاسب",
  assigned: "مُسنَد",
  in_review: "قيد المراجعة",
  completed: "مكتمل",
  rejected: "مرفوض",
};

export default function AccountantHomeScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, user, loading: authLoading } = useAuth();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAccountantRole, setIsAccountantRole] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [open, setOpen] = useState<VerificationRequestRow[]>([]);
  const [mine, setMine] = useState<VerificationRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleCheckError, setRoleCheckError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setCheckingRole(true);
    setRoleCheckError(false);
    const [
      { data: profile, error: profileError },
      { data: accountant, error: accountantError },
    ] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("accountants").select("id, is_active").eq("id", user.id).maybeSingle(),
    ]);
    if (profileError || accountantError) {
      console.error("[accountant] role check failed", profileError, accountantError);
      setRoleCheckError(true);
      setCheckingRole(false);
      return;
    }
    setIsAccountantRole(profile?.role === "accountant");
    setHasProfile(!!accountant);
    setIsActive(accountant?.is_active === true);
    setCheckingRole(false);

    if (profile?.role === "accountant" && accountant?.is_active) {
      setLoading(true);
      const [openRes, mineRes] = await Promise.all([
        listOpenVerificationRequests(),
        listMyAssignedRequests(),
      ]);
      setOpen(openRes.data ?? []);
      setMine(mineRes.data ?? []);
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [load, session]),
  );

  async function registerAsAccountant() {
    if (!user) return;
    setRegistering(true);
    const { error } = await supabase.from("accountants").insert({ id: user.id });
    setRegistering(false);
    if (!error) load();
  }

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>لوحة المحاسب</Text>
      </View>

      {checkingRole ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={t.text} />
        </View>
      ) : roleCheckError ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center" }}>
            تعذّر التحقق من صلاحياتك الآن.
          </Text>
          <Button label="إعادة المحاولة" variant="secondary" onPress={() => load()} />
        </View>
      ) : !isAccountantRole ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: t.text, textAlign: "center" }}>
            هذا القسم مخصص للمحاسبين المعتمدين
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 21 }}>
            إذا كنت محاسبًا مرخّصًا وتريد الانضمام لتقديم خدمة التوثيق المالي، تواصل مع فريق معيار لتفعيل صلاحية حسابك.
          </Text>
        </View>
      ) : !hasProfile ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: t.text, textAlign: "center" }}>
            أكمل ملفك كمحاسب
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 21 }}>
            لبدء استلام طلبات التوثيق المالي، أنشئ ملف المحاسب الخاص بك أولًا. سيراجع فريق معيار ملفك ويفعّله قبل ظهور الطلبات لك.
          </Text>
          <Button label="إنشاء ملف المحاسب" loading={registering} onPress={registerAsAccountant} />
        </View>
      ) : !isActive ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: t.text, textAlign: "center" }}>
            ملفك قيد المراجعة
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 21 }}>
            تم إنشاء ملف المحاسب الخاص بك. سيقوم فريق معيار بمراجعته وتفعيله، وبعدها ستظهر لك طلبات التوثيق المتاحة.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => "x"}
          renderItem={null}
          ListHeaderComponent={
            <View style={{ padding: 18, gap: 24 }}>
              <Section
                title="طلبات مفتوحة"
                rows={open}
                emptyText="لا توجد طلبات توثيق مفتوحة حاليًا."
                loading={loading}
                onPressRow={(id) => router.push(`/accountant/${id}`)}
              />
              <Section
                title="طلباتي"
                rows={mine}
                emptyText="لم تستلم أي طلب توثيق بعد."
                loading={loading}
                onPressRow={(id) => router.push(`/accountant/${id}`)}
              />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Section({
  title,
  rows,
  emptyText,
  loading,
  onPressRow,
}: {
  title: string;
  rows: VerificationRequestRow[];
  emptyText: string;
  loading: boolean;
  onPressRow: (id: string) => void;
}) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text, textAlign: "right" }}>{title}</Text>
      {loading ? (
        <ActivityIndicator color={t.text} />
      ) : rows.length === 0 ? (
        <Card>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right" }}>{emptyText}</Text>
        </Card>
      ) : (
        rows.map((row) => (
          <Tappable key={row.id} onPress={() => onPressRow(row.id)} haptic="light">
            <Card style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text, textAlign: "right" }}>
                {row.listing_title ?? "إعلان"}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted }}>{STATUS_LABEL[row.status]}</Text>
            </Card>
          </Tappable>
        ))
      )}
    </View>
  );
}
