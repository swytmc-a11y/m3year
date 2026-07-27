import { useEffect, useState } from "react";
import { View, Text, ScrollView, Share, Modal } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Button, Card, Field, IconButton, Skeleton, Tappable, staggerEnter } from "@/components/kit";
import { ChevronBackIcon, HeartIcon } from "@/components/icons";
import { VerifiedBadge, StatusBadge, Metric } from "@/components/listings";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { getOrCreateFranchiseConversation, sendMessage } from "@/lib/messaging";
import { getUserRatingSummary, type RatingSummary } from "@/lib/ratings";
import { RatingSummaryLabel } from "@/components/rating-stars";
import { isFranchiseFavorited, toggleFranchiseFavorite } from "@/lib/favorites";
import { SECTOR_LABELS, formatSar, formatDate } from "@/lib/constants";
import {
  formatSarRange,
  FRANCHISE_TYPE_LABELS,
  type Franchise,
  type FranchiseType,
} from "@/lib/franchise-constants";
import { fonts, radius } from "@/theme";

export default function FranchiseDetailScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, user } = useAuth();
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestCapital, setRequestCapital] = useState("");
  const [requestCity, setRequestCity] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [ownerRating, setOwnerRating] = useState<RatingSummary | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: qError } = await supabase
        .from("franchises")
        .select("*")
        .eq("id", String(id))
        .maybeSingle();
      if (!active) return;
      if (qError) {
        console.error("[franchise] load failed", qError);
        setError(true);
      } else {
        setFranchise(data);
        if (data) {
          const [summary, favorite] = await Promise.all([
            getUserRatingSummary(data.owner_id),
            isFranchiseFavorited(data.id),
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

  const isVerified = franchise?.verification_status === "verified";
  const isPreview = franchise ? franchise.status !== "published" : false;
  const isOwner = franchise && user ? franchise.owner_id === user.id : false;

  function onOpenRequest() {
    if (!franchise) return;
    if (!session) {
      router.push("/auth");
      return;
    }
    setRequestError(null);
    setRequestModalOpen(true);
  }

  async function onSubmitRequest() {
    if (!franchise) return;
    const capital = Number(requestCapital.replace(/[^\d.]/g, ""));
    if (!requestCapital.trim() || Number.isNaN(capital) || capital <= 0) {
      setRequestError("أدخل رأس المال المتاح كرقم صحيح.");
      return;
    }
    if (!requestCity.trim()) {
      setRequestError("أدخل المدينة المفضّلة للتشغيل.");
      return;
    }
    setRequestError(null);
    setContactError(null);
    setContacting(true);
    const { conversationId, error: convError } = await getOrCreateFranchiseConversation(
      franchise.id,
      franchise.owner_id,
    );
    if (convError || !conversationId) {
      setContacting(false);
      setContactError(convError ?? "تعذّر بدء المحادثة الآن.");
      return;
    }
    await sendMessage(
      conversationId,
      `طلب فرصة امتياز جديد\nرأس المال المتاح: ${formatSar(capital)}\nالمدينة المفضّلة: ${requestCity.trim()}`,
    );
    setContacting(false);
    setRequestModalOpen(false);
    router.push(`/messages/${conversationId}`);
  }

  async function onToggleFavorite() {
    if (!franchise) return;
    if (!session) {
      router.push("/auth");
      return;
    }
    setFavoriteError(null);
    const { favorited: next, error: favError } = await toggleFranchiseFavorite(
      franchise.id,
      favorited,
    );
    setFavorited(next);
    if (favError) setFavoriteError(favError);
  }

  async function onShare() {
    if (!franchise) return;
    try {
      await Share.share({
        message: `${franchise.brand_name} — عبر معيار\nhttps://miyar.app/franchises/${franchise.id}`,
      });
    } catch (err) {
      console.error("[franchise] share failed", err);
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
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text }}>تفاصيل الامتياز</Text>
        {franchise ? (
          <View style={{ flexDirection: "row-reverse", gap: 8 }}>
            <IconButton accessibilityLabel="مشاركة الامتياز" onPress={onShare}>
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
      ) : error || !franchise ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted, textAlign: "center" }}>
            {error ? "تعذّر تحميل الامتياز الآن." : "هذا الامتياز غير متاح أو غير منشور."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
          {isPreview ? (
            <Card style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, flex: 1, textAlign: "right" }}>
                معاينة — هذا الامتياز غير منشور للعامة.
              </Text>
              <StatusBadge status={franchise.status} />
            </Card>
          ) : null}

          {franchise.photo_urls && franchise.photo_urls.length > 0 ? (
            <Animated.View entering={ZoomIn.springify().damping(20).mass(0.65)}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>
                {franchise.photo_urls.map((url) => (
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
                <View style={{ flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
                  {franchise.logo_url ? (
                    <Image
                      source={{ uri: franchise.logo_url }}
                      style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: t.surface2 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: t.text, textAlign: "right" }}>
                      {franchise.brand_name}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, marginTop: 4, textAlign: "right" }}>
                      قطاع {SECTOR_LABELS[franchise.sector]} · {franchise.city}
                    </Text>
                  </View>
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
                <Metric label="رسوم الامتياز" value={formatSar(franchise.franchise_fee)} />
                <Metric
                  label="الاستثمار المبدئي"
                  value={formatSarRange(franchise.initial_investment_min, franchise.initial_investment_max, formatSar)}
                  amber
                />
                {franchise.royalty_percentage != null ? (
                  <Metric label="نسبة الإتاوة" value={`${franchise.royalty_percentage}٪`} />
                ) : null}
                {franchise.contract_duration_years != null ? (
                  <Metric label="مدة عقد الامتياز" value={`${franchise.contract_duration_years} سنوات`} />
                ) : null}
              </View>

              {franchise.description ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 26, color: t.text, textAlign: "right" }}>
                  {franchise.description}
                </Text>
              ) : null}

              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                {isVerified && franchise.verified_at ? `تحقق محاسبي: ${formatDate(franchise.verified_at)}` : "لم يُوثّق هذا الامتياز ماليًا بعد."}
              </Text>

              <View style={{ gap: 10 }}>
                <DetailRow label="نوع الامتياز" value={FRANCHISE_TYPE_LABELS[franchise.franchise_type as FranchiseType]} />
                {franchise.current_branches_count != null ? (
                  <DetailRow label="عدد الفروع الحالية" value={String(franchise.current_branches_count)} />
                ) : null}
                {franchise.founding_year != null ? (
                  <DetailRow label="سنة تأسيس العلامة" value={String(franchise.founding_year)} />
                ) : null}
                {franchise.required_space_sqm != null ? (
                  <DetailRow label="المساحة المطلوبة" value={`${franchise.required_space_sqm} م²`} />
                ) : null}
                {franchise.required_employees_count != null ? (
                  <DetailRow label="عدد الموظفين المطلوب" value={String(franchise.required_employees_count)} />
                ) : null}
                {franchise.expected_payback_months != null ? (
                  <DetailRow label="مدة استرداد رأس المال" value={`${franchise.expected_payback_months} شهرًا`} />
                ) : null}
                <DetailRow label="تدريب المشغّل" value={franchise.training_provided ? "متاح" : "غير متاح"} />
                {franchise.operational_support ? (
                  <DetailRow label="الدعم التشغيلي" value={franchise.operational_support} />
                ) : null}
                {franchise.marketing_support ? (
                  <DetailRow label="الدعم التسويقي" value={franchise.marketing_support} />
                ) : null}
              </View>

              {ownerRating ? (
                <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted }}>تقييم صاحب الامتياز</Text>
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
                  <Button label="طلب فرصة" fullWidth loading={contacting} onPress={onOpenRequest} />
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
            <Link href={{ pathname: "/report", params: { targetType: "franchise", targetId: franchise.id } }} asChild>
              <Tappable haptic="none" style={{ alignSelf: "center" }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger }}>الإبلاغ عن هذا الامتياز</Text>
              </Tappable>
            </Link>
          ) : null}

          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "center" }}>
            معيار منصة إعلانات وتوثيق فقط — اتفاقية الامتياز تتم خارج المنصة.
          </Text>
        </ScrollView>
      )}

      <Modal visible={requestModalOpen} transparent animationType="fade" onRequestClose={() => setRequestModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(16,16,20,0.55)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: t.surface, borderRadius: radius.xl, padding: 24, gap: 16 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: t.text, textAlign: "right" }}>
              طلب فرصة الامتياز
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 20 }}>
              معلوماتك تُرسل مباشرة كرسالة أولى لصاحب الامتياز، ثم تقدر تكمل المحادثة معه.
            </Text>

            <Field
              label="رأس المال المتاح لديك (ر.س)"
              value={requestCapital}
              onChangeText={setRequestCapital}
              placeholder="500000"
              keyboardType="number-pad"
              style={{ fontFamily: fonts.numeric, textAlign: "left" }}
            />
            <Field
              label="المدينة المفضّلة للتشغيل"
              value={requestCity}
              onChangeText={setRequestCity}
              placeholder="جدة"
              textAlign="right"
            />

            {requestError ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right" }}>
                {requestError}
              </Text>
            ) : null}

            <Button label="إرسال الطلب" fullWidth loading={contacting} onPress={onSubmitRequest} />
            <Button label="إلغاء" variant="secondary" fullWidth onPress={() => setRequestModalOpen(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text, textAlign: "left", flexShrink: 1, marginRight: 12 }}>
        {value}
      </Text>
    </View>
  );
}
