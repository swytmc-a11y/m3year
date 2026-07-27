import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, TopBar } from "@/components/ui";
import { StatusBadge, VerifiedBadge, VerificationStatusPill, Metric } from "@/components/listings";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { submitFranchiseForReview, archiveFranchise } from "@/lib/franchises-actions";
import { requestFranchiseVerification } from "@/lib/verification-actions";
import { SECTOR_LABELS, formatSar } from "@/lib/constants";
import { formatSarRange, type Franchise } from "@/lib/franchise-constants";
import { colors, fonts } from "@/theme";

export default function MyFranchisesScreen() {
  const router = useRouter();
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
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar
        title="امتيازاتي"
        onBack={() => router.back()}
        right={<Button label="امتياز جديد" onPress={() => router.push("/my-franchises/new")} />}
      />

      <FlatList
        data={franchises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}
        ListHeaderComponent={
          verifyError ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right", marginBottom: 4 }}>
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
            onRequestVerification={() =>
              runAction(() => requestFranchiseVerification(item.id), item.id)
            }
            onManageVerification={() => router.push(`/my-franchises/${item.id}/verification`)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.white,
                borderColor: colors.grid,
                borderWidth: 1,
                borderRadius: 12,
                padding: 40,
                alignItems: "center",
                gap: 16,
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText }}>
                {error ? "تعذّر تحميل امتيازاتك الآن." : "لم تنشئ أي امتياز بعد."}
              </Text>
              {!error ? (
                <Button label="أنشئ أول امتياز" onPress={() => router.push("/my-franchises/new")} />
              ) : null}
            </View>
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
  const canSubmit = franchise.status === "draft" || franchise.status === "rejected";
  const canArchive = franchise.status !== "archived";
  const canRequestVerification =
    franchise.verification_status === "none" || franchise.verification_status === "rejected";
  const hasVerificationRequest = !canRequestVerification;

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderColor: colors.grid,
        borderWidth: 1,
        borderRadius: 12,
        padding: 20,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, textAlign: "right" }}>
            {franchise.brand_name}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, marginTop: 4, textAlign: "right" }}>
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
          borderColor: colors.grid,
          borderStyle: "dashed",
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
        <View style={{ backgroundColor: colors.dangerBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.danger, textAlign: "right" }}>
            سبب الرفض: {franchise.rejection_reason}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        {franchise.verification_status !== "verified" ? (
          <VerificationStatusPill status={franchise.verification_status} />
        ) : null}
        {canRequestVerification ? (
          <Button label="اطلب التوثيق المالي" variant="ghost" onPress={onRequestVerification} />
        ) : null}
        {hasVerificationRequest ? (
          <Button label="إدارة التوثيق ورفع القوائم المالية" variant="ghost" onPress={onManageVerification} />
        ) : null}
      </View>

      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, opacity: busy ? 0.5 : 1 }}>
        <Button label="تعديل" variant="ghost" onPress={onEdit} />
        {franchise.status === "published" ? <Button label="عرض عام" variant="ghost" onPress={onView} /> : null}
        {canSubmit ? <Button label="إرسال للمراجعة" variant="verify" onPress={onSubmit} /> : null}
        {canArchive ? <Button label="أرشفة" variant="ghost" onPress={onArchive} /> : null}
      </View>
    </View>
  );
}
