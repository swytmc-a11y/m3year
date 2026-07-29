import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl, Alert } from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  SegmentedControl,
  Skeleton,
  useRefreshTint,
  useToast,
} from "@/components/kit";
import { ChevronBackIcon, OpportunityIcon, StorefrontIcon } from "@/components/icons";
import { CreateTypeSheet } from "@/components/create-type-sheet";
import { StatusBadge, VerifiedBadge, VerificationStatusPill, Metric } from "@/components/listings";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { submitListingForReview, archiveListing, unarchiveListing } from "@/lib/listings-actions";
import { submitFranchiseForReview, archiveFranchise, unarchiveFranchise } from "@/lib/franchises-actions";
import { requestVerification, requestFranchiseVerification } from "@/lib/verification-actions";
import { SECTOR_LABELS, formatSar, formatPercentage, type Listing } from "@/lib/constants";
import { formatSarRange, type Franchise } from "@/lib/franchise-constants";
import { fonts, radius } from "@/theme";

type Kind = "listings" | "franchises";

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "listings", label: "فرص استثمارية" },
  { value: "franchises", label: "امتيازات تجارية" },
];

/**
 * One "إعلاناتي" home for everything the user has posted. A franchise and an
 * investment opportunity are both ads, so they live behind one entry point with
 * a section switch rather than two separate destinations.
 */
export default function MyAdsScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const refreshTint = useRefreshTint();
  const { session, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ kind?: string }>();

  const [kind, setKind] = useState<Kind>(params.kind === "franchises" ? "franchises" : "listings");
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [franchises, setFranchises] = useState<Franchise[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setError(false);
    const [listingsRes, franchisesRes] = await Promise.all([
      supabase.from("listings").select("*").eq("owner_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("franchises").select("*").eq("owner_id", session.user.id).order("created_at", { ascending: false }),
    ]);
    if (listingsRes.error || franchisesRes.error) {
      console.error("[my-ads] load failed", listingsRes.error, franchisesRes.error);
      setError(true);
    } else {
      setListings(listingsRes.data);
      setFranchises(franchisesRes.data);
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

  async function runAction(fn: () => Promise<{ error?: string }>, id: string, successMessage: string) {
    setBusyId(id);
    const result = await fn();
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(successMessage, "success");
    }
    await load();
    setBusyId(null);
  }

  // Archiving pulls a live (possibly promoted) ad out of the marketplace with
  // no other undo path in this screen, so it gets a confirm step rather than
  // firing on a single tap.
  function confirmArchive(title: string, onConfirm: () => void) {
    Alert.alert("أرشفة الإعلان؟", `سيتم إخفاء "${title}" من نتائج التصفح. يمكنك إلغاء الأرشفة لاحقًا.`, [
      { text: "إلغاء", style: "cancel" },
      { text: "أرشفة", style: "destructive", onPress: onConfirm },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const rows: (Listing | Franchise)[] = kind === "listings" ? (listings ?? []) : (franchises ?? []);
  const counts = { listings: listings?.length ?? 0, franchises: franchises?.length ?? 0 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>إعلاناتي</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 16, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshTint} />}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} />
            <Text style={{ fontFamily: fonts.numeric, fontSize: 10, color: t.textMuted, textAlign: "right" }}>
              {kind === "listings" ? `${counts.listings} فرصة` : `${counts.franchises} امتياز`}
            </Text>
          </View>
        }
        renderItem={({ item }) =>
          kind === "listings" ? (
            <ListingRow
              listing={item as Listing}
              busy={busyId === item.id}
              onEdit={() => router.push(`/my-listings/${item.id}/edit`)}
              onView={() => router.push(`/listings/${item.id}`)}
              onSubmit={() => runAction(() => submitListingForReview(item.id), item.id, "أُرسل الإعلان للمراجعة.")}
              onArchive={() =>
                confirmArchive((item as Listing).title, () =>
                  runAction(() => archiveListing(item.id), item.id, "تمت الأرشفة."),
                )
              }
              onUnarchive={() => runAction(() => unarchiveListing(item.id), item.id, "أُلغيت الأرشفة.")}
              onRequestVerification={() =>
                runAction(() => requestVerification(item.id), item.id, "أُرسل طلب التوثيق.")
              }
              onManageVerification={() => router.push(`/my-listings/${item.id}/verification`)}
              onPromote={() => router.push(`/promote?type=listing&id=${item.id}`)}
            />
          ) : (
            <FranchiseRow
              franchise={item as Franchise}
              busy={busyId === item.id}
              onEdit={() => router.push(`/my-franchises/${item.id}/edit`)}
              onView={() => router.push(`/franchises/${item.id}`)}
              onSubmit={() => runAction(() => submitFranchiseForReview(item.id), item.id, "أُرسل الامتياز للمراجعة.")}
              onArchive={() =>
                confirmArchive((item as Franchise).brand_name, () =>
                  runAction(() => archiveFranchise(item.id), item.id, "تمت الأرشفة."),
                )
              }
              onUnarchive={() => runAction(() => unarchiveFranchise(item.id), item.id, "أُلغيت الأرشفة.")}
              onRequestVerification={() =>
                runAction(() => requestFranchiseVerification(item.id), item.id, "أُرسل طلب التوثيق.")
              }
              onManageVerification={() => router.push(`/my-franchises/${item.id}/verification`)}
              onPromote={() => router.push(`/promote?type=franchise&id=${item.id}`)}
            />
          )
        }
        ListEmptyComponent={
          loading ? (
            <Skeleton width="100%" height={170} radius={radius.xl} />
          ) : error ? (
            <EmptyState
              title="تعذّر التحميل"
              description="تعذّر تحميل إعلاناتك الآن."
              action={<Button label="إعادة المحاولة" variant="secondary" onPress={() => load()} />}
            />
          ) : (
            <EmptyState
              icon={
                kind === "listings" ? (
                  <OpportunityIcon color={t.textMuted} size={20} />
                ) : (
                  <StorefrontIcon color={t.textMuted} size={20} />
                )
              }
              title={kind === "listings" ? "لا توجد فرص بعد" : "لا توجد امتيازات بعد"}
              description={
                kind === "listings"
                  ? "اعرض مشروعك القائم أمام شركاء ممولين."
                  : "اطرح علامتك التجارية للتوسّع عبر امتيازات."
              }
              action={<Button label="أضف إعلانًا" onPress={() => setCreateOpen(true)} />}
            />
          )
        }
      />

      <CreateTypeSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
    </SafeAreaView>
  );
}

function RowShell({
  title,
  subtitle,
  status,
  verified,
  metrics,
  rejectionReason,
  verificationStatus,
  busy,
  canSubmit,
  canArchive,
  isArchived,
  published,
  featuredUntil,
  onEdit,
  onView,
  onSubmit,
  onArchive,
  onUnarchive,
  onRequestVerification,
  onManageVerification,
  onPromote,
}: {
  title: string;
  subtitle: string;
  status: React.ComponentProps<typeof StatusBadge>["status"];
  verified: boolean;
  metrics: React.ReactNode;
  rejectionReason?: string | null;
  verificationStatus: React.ComponentProps<typeof VerificationStatusPill>["status"];
  busy: boolean;
  canSubmit: boolean;
  canArchive: boolean;
  isArchived: boolean;
  published: boolean;
  featuredUntil?: string | null;
  onEdit: () => void;
  onView: () => void;
  onSubmit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onRequestVerification: () => void;
  onManageVerification: () => void;
  onPromote: () => void;
}) {
  const { t } = useTheme();
  const canRequestVerification = verificationStatus === "none" || verificationStatus === "rejected";
  const isFeatured = Boolean(featuredUntil && new Date(featuredUntil) > new Date());

  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>{title}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, marginTop: 3, textAlign: "right" }}>
            {subtitle}
          </Text>
        </View>
        <View style={{ alignItems: "flex-start", gap: 7 }}>
          <StatusBadge status={status} />
          {verified ? <VerifiedBadge /> : null}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row-reverse",
          gap: 30,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: t.border,
          paddingVertical: 11,
        }}
      >
        {metrics}
      </View>

      {rejectionReason ? (
        <View style={{ backgroundColor: t.dangerTint, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.danger, textAlign: "right" }}>
            سبب الرفض: {rejectionReason}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        {!verified ? <VerificationStatusPill status={verificationStatus} /> : null}
        {canRequestVerification ? (
          <Button label="اطلب التوثيق المالي" variant="secondary" fullWidth onPress={onRequestVerification} />
        ) : (
          <Button label="إدارة التوثيق ورفع القوائم" variant="secondary" fullWidth onPress={onManageVerification} />
        )}
      </View>

      {/* Promotion is only meaningful for something already visible in the
          feed, so it stays hidden until the ad is actually published. */}
      {published ? (
        isFeatured ? (
          <View
            style={{
              backgroundColor: t.successTint,
              borderRadius: radius.md,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: t.success, textAlign: "right" }}>
              مميّز حتى {new Date(featuredUntil!).toLocaleDateString("ar-SA")}
            </Text>
          </View>
        ) : (
          <Button label="تمييز الإعلان" variant="secondary" fullWidth onPress={onPromote} />
        )
      ) : null}

      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, opacity: busy ? 0.5 : 1 }}>
        <Button label="تعديل" variant="secondary" onPress={onEdit} />
        {published ? <Button label="عرض عام" variant="secondary" onPress={onView} /> : null}
        {canSubmit ? <Button label="إرسال للمراجعة" onPress={onSubmit} /> : null}
        {canArchive ? <Button label="أرشفة" variant="secondary" onPress={onArchive} /> : null}
        {isArchived ? <Button label="إلغاء الأرشفة" variant="secondary" onPress={onUnarchive} /> : null}
      </View>
    </Card>
  );
}

function ListingRow({
  listing,
  ...handlers
}: {
  listing: Listing;
  busy: boolean;
  onEdit: () => void;
  onView: () => void;
  onSubmit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onRequestVerification: () => void;
  onManageVerification: () => void;
  onPromote: () => void;
}) {
  return (
    <RowShell
      title={listing.title}
      subtitle={`قطاع ${SECTOR_LABELS[listing.sector]} · ${listing.city}`}
      status={listing.status}
      verified={listing.verification_status === "verified"}
      verificationStatus={listing.verification_status}
      rejectionReason={listing.status === "rejected" ? listing.rejection_reason : null}
      canSubmit={listing.status === "draft" || listing.status === "rejected"}
      canArchive={listing.status !== "archived"}
      isArchived={listing.status === "archived"}
      published={listing.status === "published"}
      featuredUntil={listing.featured_until}
      metrics={
        <>
          <Metric label="الإيراد الشهري" value={formatSar(listing.monthly_revenue)} />
          <Metric label="النسبة المطروحة" value={formatPercentage(listing.offered_percentage)} amber />
        </>
      }
      {...handlers}
    />
  );
}

function FranchiseRow({
  franchise,
  ...handlers
}: {
  franchise: Franchise;
  busy: boolean;
  onEdit: () => void;
  onView: () => void;
  onSubmit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onRequestVerification: () => void;
  onManageVerification: () => void;
  onPromote: () => void;
}) {
  return (
    <RowShell
      title={franchise.brand_name}
      subtitle={`قطاع ${SECTOR_LABELS[franchise.sector]} · ${franchise.city}`}
      status={franchise.status}
      verified={franchise.verification_status === "verified"}
      verificationStatus={franchise.verification_status}
      rejectionReason={franchise.status === "rejected" ? franchise.rejection_reason : null}
      canSubmit={franchise.status === "draft" || franchise.status === "rejected"}
      canArchive={franchise.status !== "archived"}
      isArchived={franchise.status === "archived"}
      published={franchise.status === "published"}
      featuredUntil={franchise.featured_until}
      metrics={
        <>
          <Metric label="رسوم الامتياز" value={formatSar(franchise.franchise_fee)} />
          <Metric
            label="الاستثمار المبدئي"
            value={formatSarRange(franchise.initial_investment_min, franchise.initial_investment_max, formatSar)}
            amber
          />
        </>
      }
      {...handlers}
    />
  );
}
