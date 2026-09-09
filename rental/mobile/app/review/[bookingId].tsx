import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { useRouter, useLocalSearchParams, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Button, Card, IconButton, Skeleton, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { RatingInput } from "@/components/rating";
import { useTheme } from "@/contexts/theme";
import { useAuth } from "@/contexts/auth";
import { fetchReviewableBookings, submitReview, type ReviewableBooking } from "@/lib/reviews";
import { carTitle } from "@/lib/constants";
import { fonts, radius } from "@/theme";

const MAX_COMMENT = 500;

export default function ReviewScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState<ReviewableBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchReviewableBookings();
      setBooking(list.find((b) => b.id === bookingId) ?? null);
    } catch (err) {
      console.error("[review] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit() {
    if (!booking || rating < 1) return;
    setSaving(true);
    try {
      await submitReview({
        bookingId: booking.id,
        carId: booking.car_id,
        branchId: booking.branch_id,
        rating,
        comment,
      });
      toast("شكرًا لك، نُشر تقييمك.");
      router.back();
    } catch (err) {
      console.error("[review] submit failed", err);
      toast("تعذّر إرسال التقييم الآن. حاول مرة أخرى.", "error");
      setSaving(false);
    }
  }

  if (!authLoading && !session) return <Redirect href="/auth" />;

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
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>
          تقييم التجربة
        </Text>
      </View>

      {loading || authLoading ? (
        <View style={{ padding: 18, gap: 14 }}>
          <Skeleton width="100%" height={90} />
          <Skeleton width="100%" height={140} />
        </View>
      ) : !booking ? (
        // Either the booking is not this customer's, is not finished, or has
        // already been reviewed — the unique constraint makes the last case
        // permanent, so there is nothing to retry here.
        <View style={{ padding: 18 }}>
          <Card>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 13.5,
                color: t.text,
                textAlign: "right",
                lineHeight: 22,
              }}
            >
              لا يوجد حجز مكتمل بانتظار التقييم هنا. ربما قيّمت هذه الرحلة سابقًا.
            </Text>
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Card style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
            {booking.car?.cover_image ? (
              <Image
                source={{ uri: booking.car.cover_image }}
                style={{ width: 76, height: 56, borderRadius: radius.md, backgroundColor: t.surface2 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontFamily: fonts.displayBold, fontSize: 14.5, color: t.text, textAlign: "right" }}
              >
                {booking.car ? carTitle(booking.car) : "السيارة"}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.numeric,
                  fontSize: 11.5,
                  color: t.textMuted,
                  textAlign: "right",
                  marginTop: 3,
                }}
              >
                {booking.reference}
              </Text>
            </View>
          </Card>

          <Card style={{ gap: 18, paddingVertical: 22 }}>
            <Text
              style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "center" }}
            >
              كيف كانت تجربتك؟
            </Text>
            <RatingInput value={rating} onChange={setRating} />
          </Card>

          <Card style={{ gap: 8 }}>
            <Text
              style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text, textAlign: "right" }}
            >
              أضف ملاحظة (اختياري)
            </Text>
            <TextInput
              value={comment}
              onChangeText={(v) => setComment(v.slice(0, MAX_COMMENT))}
              placeholder="ما الذي أعجبك أو يمكن تحسينه؟"
              placeholderTextColor={t.textMuted}
              multiline
              textAlign="right"
              style={{
                minHeight: 96,
                textAlignVertical: "top",
                fontFamily: fonts.body,
                fontSize: 13.5,
                color: t.text,
                backgroundColor: t.surface2,
                borderRadius: radius.md,
                padding: 12,
                lineHeight: 22,
              }}
            />
            <Text
              style={{ fontFamily: fonts.numeric, fontSize: 11, color: t.textMuted, textAlign: "left" }}
            >
              {comment.length}/{MAX_COMMENT}
            </Text>
          </Card>

          <Button
            label="نشر التقييم"
            onPress={onSubmit}
            disabled={rating < 1}
            loading={saving}
            fullWidth
          />

          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 11.5,
              color: t.textMuted,
              textAlign: "center",
              lineHeight: 19,
            }}
          >
            يظهر تقييمك للعملاء الآخرين باسمك الأول فقط.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
