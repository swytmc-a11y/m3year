import { useCallback, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, IconButton, Skeleton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { StatusBadge, VerifiedBadge, VerificationStatusPill, Metric } from "@/components/listings";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { submitFranchiseForReview, archiveFranchise } from "@/lib/franchises-actions";
import { requestFranchiseVerification } from "@/lib/verification-actions";
import { SECTOR_LABELS, formatSar } from "@/lib/constants";
import { formatSarRange, type Franchise } from "@/lib/franchise-constants";
import { fonts, radius } from "@/theme";

export default function MyFranchisesScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, loading: authLoading } = useAuth();
  const [franchises, setFranchises] = useState<Franchise[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setError(false);
    const { data, error: qError } = await supabase
      .from("franchises")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });
    if (qError) {
      console.error("[my-franchises] load failed", qError);
      setError(true);
    } else {
      setFranchises(data);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  async function runAction(fn: () => Promise<{ error?: string }>, id: string) {
    setBusyId(id);
    const result = await fn();
    setVerifyError(result.error ?? null);
    await load();
    setBusyId(null);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 10 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
          <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
            <ChevronBackIcon color={t.text} />
          </IconButton>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>امتيازاتي</Text>
        </View>
        <Button label="امتياز جديد" onPress={() => router.push("/my-franchises/new")} />
      </View>

      <FlatList
        data={franchises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 16, flexGrow: 1 }}
        ListHeaderComponent={
          verifyError ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.danger, textAlign: "right", marginBottom: 4 }}>
              {verifyError}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <MyRow
            franchise={item}
            busy={busyId === item.id}
            onEdit={() => router.push(`/my-franchises/${item.id}/edit`)}
            onView={() => router.push(`/franchises/${item.id}`)}
            onSubmit={() => runAction(() => submitFranchiseForReview(item.id), item.id)}
            onArchive={() => runAction(() => archiveFranchise(item.id), item.id)}
            onRequestVerification={() => runAction(() => requestFranchiseVerification(item.id), item.id)}
            onManageVerification={() => router.push(`/my-franchises/${item.id}/verification`)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <Skeleton width="100%" height={160} radius={radius.xl} />
          ) : (
            <Card style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted }}>
                {error ? "تعذّر تحميل امتيازاتك الآن." : "لم تنشئ أي امتياز بعد."}
              </Text>
              {!error ? <Button label="أنشئ أول امتياز" onPress={() => router.push("/my-franchises/new")} /> : null}
            </Card>
          )
        }
      />
    </SafeAreaView>
  );
}

function MyRow({
  franchise,
  busy,
  onEdit,
  onView,
  onSubmit,
  onArchive,
  onRequestVerification,
  onManageVerification,
}: {
  franchise: Franchise;
  busy: boolean;
  onEdit: () => void;
  onView: () => void;
  onSubmit: () => void;
  onArchive: () => void;
  onRequestVerification: () => void;
  onManageVerification: () => void;
}) {
  const { t } = useTheme();
  const canSubmit = franchise.status === "draft" || franchise.status === "rejected";
  const canArchive = franchise.status !== "archived";
  const canRequestVerification =
    franchise.verification_status === "none" || franchise.verification_status === "rejected";
  const hasVerificationRequest = !canRequestVerification;

  return (
    <Card style={{ padding: 20, gap: 14 }}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text, textAlign: "right" }}>
            {franchise.brand_name}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, marginTop: 4, textAlign: "right" }}>
            قطاع {SECTOR_LABELS[franchise.sector]} · {franchise.city}
          </Text>
        </View>
        <View style={{ alignItems: "flex-start", gap: 8 }}>
          <StatusBadge status={franchise.status} />
          {franchise.verification_status === "verified" ? <VerifiedBadge /> : null}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row-reverse",
          gap: 32,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: t.border,
          paddingVertical: 12,
        }}
      >
        <Metric label="رسوم الامتياز" value={formatSar(franchise.franchise_fee)} />
        <Metric
          label="الاستثمار المبدئي"
          value={formatSarRange(franchise.initial_investment_min, franchise.initial_investment_max, formatSar)}
          amber
        />
      </View>

      {franchise.status === "rejected" && franchise.rejection_reason ? (
        <View style={{ backgroundColor: t.dangerTint, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.danger, textAlign: "right" }}>
            سبب الرفض: {franchise.rejection_reason}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        {franchise.verification_status !== "verified" ? <VerificationStatusPill status={franchise.verification_status} /> : null}
        {canRequestVerification ? <Button label="اطلب التوثيق المالي" variant="secondary" onPress={onRequestVerification} /> : null}
        {hasVerificationRequest ? (
          <Button label="إدارة التوثيق ورفع القوائم المالية" variant="secondary" onPress={onManageVerification} />
        ) : null}
      </View>

      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, opacity: busy ? 0.5 : 1 }}>
        <Button label="تعديل" variant="secondary" onPress={onEdit} />
        {franchise.status === "published" ? <Button label="عرض عام" variant="secondary" onPress={onView} /> : null}
        {canSubmit ? <Button label="إرسال للمراجعة" onPress={onSubmit} /> : null}
        {canArchive ? <Button label="أرشفة" variant="secondary" onPress={onArchive} /> : null}
      </View>
    </Card>
  );
}
