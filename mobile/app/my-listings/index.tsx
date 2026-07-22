import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, TopBar } from "@/components/ui";
import {
  StatusBadge,
  VerifiedBadge,
  VerificationStatusPill,
  Metric,
} from "@/components/listings";
import { useAuth } from "@/contexts/auth";
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
import { colors, fonts } from "@/theme";

export default function MyListingsScreen() {
  const router = useRouter();
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.paper }}
      edges={["top"]}
    >
      <TopBar
        title="إعلاناتي"
        onBack={() => router.back()}
        right={
          <Button
            label="إعلان جديد"
            onPress={() => router.push("/my-listings/new")}
          />
        }
      />

      <FlatList
        data={listings ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}
        ListHeaderComponent={
          verifyError ? (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.amber,
                textAlign: "right",
                marginBottom: 4,
              }}
            >
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
            onSubmit={() =>
              runAction(() => submitListingForReview(item.id), item.id)
            }
            onArchive={() =>
              runAction(() => archiveListing(item.id), item.id)
            }
            onRequestVerification={() =>
              runAction(() => requestVerification(item.id), item.id)
            }
            onManageVerification={() =>
              router.push(`/my-listings/${item.id}/verification`)
            }
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
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: colors.mutedText,
                }}
              >
                {error
                  ? "تعذّر تحميل إعلاناتك الآن."
                  : "لم تنشئ أي إعلان بعد."}
              </Text>
              {!error ? (
                <Button
                  label="أنشئ أول إعلان"
                  onPress={() => router.push("/my-listings/new")}
                />
              ) : null}
            </View>
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
  const canSubmit =
    listing.status === "draft" || listing.status === "rejected";
  const canArchive = listing.status !== "archived";
  const canRequestVerification =
    listing.verification_status === "none" ||
    listing.verification_status === "rejected";
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
      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 16,
              color: colors.ink,
              textAlign: "right",
            }}
          >
            {listing.title}
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: colors.mutedText,
              marginTop: 4,
              textAlign: "right",
            }}
          >
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
          borderColor: colors.grid,
          borderStyle: "dashed",
          paddingVertical: 12,
        }}
      >
        <Metric label="الإيراد الشهري" value={formatSar(listing.monthly_revenue)} />
        <Metric
          label="النسبة المطروحة"
          value={formatPercentage(listing.offered_percentage)}
          amber
        />
      </View>

      {listing.status === "rejected" && listing.rejection_reason ? (
        <View
          style={{
            backgroundColor: colors.dangerBg,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: colors.danger,
              textAlign: "right",
            }}
          >
            سبب الرفض: {listing.rejection_reason}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        {listing.verification_status !== "verified" ? (
          <VerificationStatusPill status={listing.verification_status} />
        ) : null}
        {canRequestVerification ? (
          <Button
            label="اطلب التوثيق المالي"
            variant="ghost"
            onPress={onRequestVerification}
          />
        ) : null}
        {hasVerificationRequest ? (
          <Button
            label="إدارة التوثيق ورفع القوائم المالية"
            variant="ghost"
            onPress={onManageVerification}
          />
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row-reverse",
          flexWrap: "wrap",
          gap: 8,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Button label="تعديل" variant="ghost" onPress={onEdit} />
        {listing.status === "published" ? (
          <Button label="عرض عام" variant="ghost" onPress={onView} />
        ) : null}
        {canSubmit ? (
          <Button label="إرسال للمراجعة" variant="verify" onPress={onSubmit} />
        ) : null}
        {canArchive ? (
          <Button label="أرشفة" variant="ghost" onPress={onArchive} />
        ) : null}
      </View>
    </View>
  );
}
