import { useCallback, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, IconButton, Skeleton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import {
  StatusBadge,
  VerifiedBadge,
  VerificationStatusPill,
  Metric,
} from "@/components/listings";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import {
  submitListingForReview,
  archiveListing,
} from "@/lib/listings-actions";
import { requestVerification } from "@/lib/verification-actions";
import {
  SECTOR_LABELS,
  formatSar,
  formatPercentage,
  type Listing,
} from "@/lib/constants";
import { fonts, radius } from "@/theme";

export default function MyListingsScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setError(false);
    const { data, error: qError } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });
    if (qError) {
      console.error("[my-listings] load failed", qError);
      setError(true);
    } else {
      setListings(data);
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
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>إعلاناتي</Text>
        </View>
        <Button label="إعلان جديد" onPress={() => router.push("/my-listings/new")} />
      </View>

      <FlatList
        data={listings ?? []}
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
            listing={item}
            busy={busyId === item.id}
            onEdit={() => router.push(`/my-listings/${item.id}/edit`)}
            onView={() => router.push(`/listings/${item.id}`)}
            onSubmit={() => runAction(() => submitListingForReview(item.id), item.id)}
            onArchive={() => runAction(() => archiveListing(item.id), item.id)}
            onRequestVerification={() => runAction(() => requestVerification(item.id), item.id)}
            onManageVerification={() => router.push(`/my-listings/${item.id}/verification`)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 16 }}>
              <Skeleton width="100%" height={160} radius={radius.xl} />
            </View>
          ) : (
            <Card style={{ alignItems: "center", gap: 16, paddingVertical: 40 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted }}>
                {error ? "تعذّر تحميل إعلاناتك الآن." : "لم تنشئ أي إعلان بعد."}
              </Text>
              {!error ? <Button label="أنشئ أول إعلان" onPress={() => router.push("/my-listings/new")} /> : null}
            </Card>
          )
        }
      />
    </SafeAreaView>
  );
}

function MyRow({
  listing,
  busy,
  onEdit,
  onView,
  onSubmit,
  onArchive,
  onRequestVerification,
  onManageVerification,
}: {
  listing: Listing;
  busy: boolean;
  onEdit: () => void;
  onView: () => void;
  onSubmit: () => void;
  onArchive: () => void;
  onRequestVerification: () => void;
  onManageVerification: () => void;
}) {
  const { t } = useTheme();
  const canSubmit = listing.status === "draft" || listing.status === "rejected";
  const canArchive = listing.status !== "archived";
  const canRequestVerification =
    listing.verification_status === "none" || listing.verification_status === "rejected";
  const hasVerificationRequest = !canRequestVerification;

  return (
    <Card style={{ padding: 20, gap: 14 }}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text, textAlign: "right" }}>
            {listing.title}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, marginTop: 4, textAlign: "right" }}>
            قطاع {SECTOR_LABELS[listing.sector]} · {listing.city}
          </Text>
        </View>
        <View style={{ alignItems: "flex-start", gap: 8 }}>
          <StatusBadge status={listing.status} />
          {listing.verification_status === "verified" ? <VerifiedBadge /> : null}
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
        <Metric label="الإيراد الشهري" value={formatSar(listing.monthly_revenue)} />
        <Metric label="النسبة المطروحة" value={formatPercentage(listing.offered_percentage)} amber />
      </View>

      {listing.status === "rejected" && listing.rejection_reason ? (
        <View style={{ backgroundColor: t.dangerTint, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.danger, textAlign: "right" }}>
            سبب الرفض: {listing.rejection_reason}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        {listing.verification_status !== "verified" ? <VerificationStatusPill status={listing.verification_status} /> : null}
        {canRequestVerification ? <Button label="اطلب التوثيق المالي" variant="secondary" onPress={onRequestVerification} /> : null}
        {hasVerificationRequest ? (
          <Button label="إدارة التوثيق ورفع القوائم المالية" variant="secondary" onPress={onManageVerification} />
        ) : null}
      </View>

      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, opacity: busy ? 0.5 : 1 }}>
        <Button label="تعديل" variant="secondary" onPress={onEdit} />
        {listing.status === "published" ? <Button label="عرض عام" variant="secondary" onPress={onView} /> : null}
        {canSubmit ? <Button label="إرسال للمراجعة" onPress={onSubmit} /> : null}
        {canArchive ? <Button label="أرشفة" variant="secondary" onPress={onArchive} /> : null}
      </View>
    </Card>
  );
}
