import { useEffect, useState } from "react";
import { View, Text, ScrollView, Share } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Button, Card, IconButton, Skeleton, Tappable, staggerEnter, useToast } from "@/components/kit";
import { ChevronBackIcon, HeartIcon } from "@/components/icons";
import { VerifiedBadge, StatusBadge, Metric } from "@/components/listings";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { getOrCreateConversation } from "@/lib/messaging";
import { getUserRatingSummary, type RatingSummary } from "@/lib/ratings";
import { RatingSummaryLabel } from "@/components/rating-stars";
import { isFavorited, toggleFavorite } from "@/lib/favorites";
import {
  SECTOR_LABELS,
  REASON_FOR_SELLING_LABELS,
  FINANCIAL_DATA_SHARING_LABELS,
  formatSar,
  formatPercentage,
  formatDate,
  type Listing,
  type ReasonForSelling,
  type FinancialDataSharing,
} from "@/lib/constants";
import { fonts, radius } from "@/theme";

export default function ListingDetailScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [ownerRating, setOwnerRating] = useState<RatingSummary | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: qError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", String(id))
        .maybeSingle();
      if (!active) return;
      if (qError) {
        console.error("[listing] load failed", qError);
        setError(true);
      } else {
        setListing(data);
        if (data) {
          const [summary, favorite] = await Promise.all([
            getUserRatingSummary(data.owner_id),
            isFavorited(data.id),
          ]);
          if (active) {
            setOwnerRating(summary);
            setFavorited(favorite);
          }
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const isVerified = listing?.verification_status === "verified";
  const isPreview = listing ? listing.status !== "published" : false;
  const isOwner = listing && user ? listing.owner_id === user.id : false;

  async function onContact() {
    if (!listing) return;
    if (!session) {
      router.push("/auth");
      return;
    }
    setContactError(null);
    setContacting(true);
    const { conversationId, error: convError } = await getOrCreateConversation(
      listing.id,
      listing.owner_id,
    );
    setContacting(false);
    if (convError || !conversationId) {
      setContactError(convError ?? "تعذّر بدء المحادثة الآن.");
      return;
    }
    router.push(`/messages/${conversationId}`);
  }

  async function onToggleFavorite() {
    if (!listing) return;
    if (!session) {
      router.push("/auth");
      return;
    }
    setFavoriteError(null);
    const { favorited: next, error: favError } = await toggleFavorite(listing.id, favorited);
    setFavorited(next);
    if (favError) {
      setFavoriteError(favError);
      return;
    }
    toast(next ? "أُضيف إلى المفضلة." : "أُزيل من المفضلة.", "success");
  }

  async function onShare() {
    if (!listing) return;
    try {
      await Share.share({
        message: `${listing.title} — عبر معيار\nhttps://miyar.app/listings/${listing.id}`,
      });
    } catch (err) {
      console.error("[listing] share failed", err);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text }}>تفاصيل المشروع</Text>
        {listing ? (
          <View style={{ flexDirection: "row-reverse", gap: 8 }}>
            <IconButton accessibilityLabel="مشاركة الإعلان" onPress={onShare}>
              <Text style={{ fontSize: 16, color: t.text }}>⇪</Text>
            </IconButton>
            <IconButton
              accessibilityLabel={favorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
              onPress={onToggleFavorite}
            >
              <HeartIcon color={favorited ? t.primary : t.textMuted} filled={favorited} />
            </IconButton>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
          <Skeleton width="100%" height={180} radius={radius.lg} />
          <Skeleton width="70%" height={22} />
          <Skeleton width="45%" height={14} />
        </ScrollView>
      ) : error || !listing ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted, textAlign: "center" }}>
            {error ? "تعذّر تحميل الإعلان الآن." : "هذا الإعلان غير متاح أو غير منشور."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
          {isPreview ? (
            <Card style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, flex: 1, textAlign: "right" }}>
                معاينة — هذا الإعلان غير منشور للعامة.
              </Text>
              <StatusBadge status={listing.status} />
            </Card>
          ) : null}

          {listing.photo_urls && listing.photo_urls.length > 0 ? (
            <Animated.View entering={ZoomIn.springify().damping(20).mass(0.65)}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>
                {listing.photo_urls.map((url) => (
                  <Image
                    key={url}
                    source={{ uri: url }}
                    style={{ width: 260, height: 180, borderRadius: radius.xl, backgroundColor: t.surface2 }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}

          <Animated.View entering={staggerEnter(0)}>
            <Card style={{ padding: 20, gap: 20 }}>
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                    {listing.title}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, marginTop: 4, textAlign: "right" }}>
                    قطاع {SECTOR_LABELS[listing.sector]} · {listing.city}
                  </Text>
                </View>
                {isVerified ? <VerifiedBadge /> : null}
              </View>

              <View
                style={{
                  flexDirection: "row-reverse",
                  flexWrap: "wrap",
                  gap: 32,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: t.border,
                  paddingVertical: 16,
                }}
              >
                <Metric label="الإيراد الشهري" value={formatSar(listing.monthly_revenue)} />
                <Metric label="النسبة المطروحة" value={formatPercentage(listing.offered_percentage)} amber />
                {listing.asking_price != null ? (
                  <Metric
                    label={listing.price_negotiable ? "السعر المطلوب (قابل للتفاوض)" : "السعر المطلوب"}
                    value={formatSar(listing.asking_price)}
                  />
                ) : null}
                {listing.show_profit && listing.monthly_profit != null ? (
                  <Metric label="صافي الربح الشهري" value={formatSar(listing.monthly_profit)} />
                ) : null}
              </View>

              {listing.description ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 26, color: t.text, textAlign: "right" }}>
                  {listing.description}
                </Text>
              ) : null}

              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                {isVerified && listing.verified_at ? `تحقق محاسبي: ${formatDate(listing.verified_at)}` : "لم يُوثّق هذا الإعلان ماليًا بعد."}
              </Text>

              <View style={{ gap: 10 }}>
                {listing.monthly_profit != null && !listing.show_profit ? (
                  <DetailRow label="صافي الربح الشهري" value="متاح عند التواصل" />
                ) : null}
                {listing.founding_year != null ? (
                  <DetailRow label="سنة التأسيس" value={String(listing.founding_year)} />
                ) : null}
                {listing.employee_count != null ? (
                  <DetailRow label="عدد الموظفين" value={String(listing.employee_count)} />
                ) : null}
                <DetailRow
                  label="سبب البيع"
                  value={
                    listing.reason_for_selling
                      ? REASON_FOR_SELLING_LABELS[listing.reason_for_selling as ReasonForSelling]
                      : "غير محدد"
                  }
                />
                <DetailRow label="التزامات قانونية على المشروع" value={listing.has_legal_obligations ? "يوجد" : "لا يوجد"} />
                <DetailRow
                  label="مشاركة البيانات المالية"
                  value={FINANCIAL_DATA_SHARING_LABELS[listing.financial_data_sharing as FinancialDataSharing]}
                />
              </View>

              {ownerRating ? (
                <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted }}>تقييم صاحب المشروع</Text>
                  <RatingSummaryLabel average={ownerRating.average} count={ownerRating.count} />
                </View>
              ) : null}

              {favoriteError ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right" }}>
                  {favoriteError}
                </Text>
              ) : null}

              {!isPreview && !isOwner ? (
                <View style={{ gap: 8 }}>
                  <Button label="تواصل مع صاحب المشروع" fullWidth loading={contacting} onPress={onContact} />
                  {contactError ? (
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "center" }}>
                      {contactError}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Card>
          </Animated.View>

          {!isOwner ? (
            <Link href={{ pathname: "/report", params: { targetType: "listing", targetId: listing.id } }} asChild>
              <Tappable haptic="none" style={{ alignSelf: "center" }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger }}>الإبلاغ عن هذا الإعلان</Text>
              </Tappable>
            </Link>
          ) : null}

          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "center" }}>
            معيار منصة إعلانات وتوثيق فقط — صفقة الشراكة تتم خارج المنصة.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text }}>{value}</Text>
    </View>
  );
}
