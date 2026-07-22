import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable, Share } from "react-native";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, Button } from "@/components/ui";
import { VerifiedBadge, StatusBadge, Metric } from "@/components/listings";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { getOrCreateConversation } from "@/lib/messaging";
import { getUserRatingSummary, type RatingSummary } from "@/lib/ratings";
import { RatingSummaryLabel } from "@/components/rating-stars";
import { isFavorited, toggleFavorite } from "@/lib/favorites";
import {
  SECTOR_LABELS,
  formatSar,
  formatPercentage,
  formatDate,
  type Listing,
} from "@/lib/constants";
import { colors, fonts, radius } from "@/theme";

export default function ListingDetailScreen() {
  const router = useRouter();
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
    if (favError) setFavoriteError(favError);
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.paper }}
      edges={["top"]}
    >
      <TopBar
        title="تفاصيل المشروع"
        onBack={() => router.back()}
        right={
          listing ? (
            <View style={{ flexDirection: "row-reverse", gap: 16 }}>
              <Pressable onPress={onShare} hitSlop={10}>
                <Text style={{ fontSize: 18 }}>⇪</Text>
              </Pressable>
              <Pressable onPress={onToggleFavorite} hitSlop={10}>
                <Text style={{ fontSize: 18, color: favorited ? colors.amber : colors.mutedText }}>
                  {favorited ? "♥" : "♡"}
                </Text>
              </Pressable>
            </View>
          ) : undefined
        }
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : error || !listing ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.mutedText,
              textAlign: "center",
            }}
          >
            {error
              ? "تعذّر تحميل الإعلان الآن."
              : "هذا الإعلان غير متاح أو غير منشور."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {isPreview ? (
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 10,
                backgroundColor: colors.white,
                borderColor: colors.grid,
                borderWidth: 1,
                borderRadius: radius.md,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.mutedText,
                  flex: 1,
                  textAlign: "right",
                }}
              >
                معاينة — هذا الإعلان غير منشور للعامة.
              </Text>
              <StatusBadge status={listing.status} />
            </View>
          ) : null}

          {listing.photo_urls && listing.photo_urls.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}
            >
              {listing.photo_urls.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={{ width: 260, height: 180, borderRadius: radius.lg, backgroundColor: colors.white }}
                />
              ))}
            </ScrollView>
          ) : null}

          <View
            style={{
              backgroundColor: colors.white,
              borderColor: colors.grid,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: 24,
              gap: 20,
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
                    fontFamily: fonts.heading,
                    fontSize: 22,
                    color: colors.ink,
                    textAlign: "right",
                  }}
                >
                  {listing.title}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.mutedText,
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  قطاع {SECTOR_LABELS[listing.sector]} · {listing.city}
                </Text>
              </View>
              {isVerified ? <VerifiedBadge /> : null}
            </View>

            <View
              style={{
                flexDirection: "row-reverse",
                gap: 40,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.grid,
                borderStyle: "dashed",
                paddingVertical: 18,
              }}
            >
              <Metric
                label="الإيراد الشهري"
                value={formatSar(listing.monthly_revenue)}
              />
              <Metric
                label="النسبة المطروحة"
                value={formatPercentage(listing.offered_percentage)}
                amber
              />
            </View>

            {listing.description ? (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 15,
                  lineHeight: 28,
                  color: colors.ink,
                  textAlign: "right",
                }}
              >
                {listing.description}
              </Text>
            ) : null}

            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.mutedText,
                textAlign: "right",
              }}
            >
              {isVerified && listing.verified_at
                ? `تحقق محاسبي: ${formatDate(listing.verified_at)}`
                : "لم يُوثّق هذا الإعلان ماليًا بعد."}
            </Text>

            {ownerRating ? (
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText }}>
                  تقييم صاحب المشروع
                </Text>
                <RatingSummaryLabel average={ownerRating.average} count={ownerRating.count} />
              </View>
            ) : null}

            {favoriteError ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}>
                {favoriteError}
              </Text>
            ) : null}

            {!isPreview && !isOwner ? (
              <View style={{ gap: 8 }}>
                <Button
                  label="تواصل مع صاحب المشروع"
                  fullWidth
                  loading={contacting}
                  onPress={onContact}
                />
                {contactError ? (
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: colors.amber,
                      textAlign: "center",
                    }}
                  >
                    {contactError}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {!isOwner ? (
            <Link href={{ pathname: "/report", params: { targetType: "listing", targetId: listing.id } }} asChild>
              <Pressable style={{ alignSelf: "center" }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.danger }}>
                  الإبلاغ عن هذا الإعلان
                </Text>
              </Pressable>
            </Link>
          ) : null}

          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              color: colors.mutedText,
              textAlign: "center",
            }}
          >
            معيار منصة إعلانات وتوثيق فقط — صفقة الشراكة تتم خارج المنصة.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
