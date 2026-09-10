import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Chip, IconButton, Skeleton, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { fetchBooking, type MyBooking } from "@/lib/bookings-data";
import {
  quoteExtension,
  requestExtension,
  extensionMessage,
  type ExtensionQuote,
} from "@/lib/extensions";
import { addDays } from "@/lib/dates";
import { countAr, DAYS_NOUN } from "@/lib/arabic";
import { formatSar, formatDate, carTitle } from "@/lib/constants";
import { fonts, radius } from "@/theme";

// Extending is thought about in "a couple more days", not in calendar dates,
// so the choice is offered that way and the resulting date is shown back.
const OPTIONS = [1, 2, 3, 7];

export default function ExtendBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [extraDays, setExtraDays] = useState(1);
  const [quote, setQuote] = useState<ExtensionQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const b = await fetchBooking(id);
      if (!active) return;
      setBooking(b);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const newEnd = booking ? addDays(booking.end_date, extraDays) : null;

  const runQuote = useCallback(async () => {
    if (!newEnd) return;
    setQuoting(true);
    setQuote(await quoteExtension(id, newEnd));
    setQuoting(false);
  }, [id, newEnd]);

  useEffect(() => {
    if (booking) runQuote();
  }, [booking, runQuote]);

  if (authLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!session) return <Redirect href="/auth" />;

  async function onConfirm() {
    if (!newEnd) return;
    setSubmitting(true);
    const res = await requestExtension(id, newEnd);
    setSubmitting(false);

    if (!res) {
      toast("تعذّر تمديد الحجز.", "error");
      return;
    }
    if (!res.ok) {
      // The server re-checks availability at commit time, so a car taken
      // between seeing the price and confirming lands here rather than
      // becoming a double booking.
      toast(extensionMessage(res.reason), "error");
      runQuote();
      return;
    }
    toast("تم تمديد الحجز.", "success");
    router.replace(`/bookings/${id}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>تمديد الحجز</Text>
      </View>

      {loading ? (
        <View style={{ padding: 18, gap: 14 }}>
          <Skeleton width="100%" height={120} radius={radius.xl} />
          <Skeleton width="100%" height={160} radius={radius.xl} />
        </View>
      ) : !booking ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted }}>
            الحجز غير موجود.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 40 }}>
          <Card style={{ padding: 18, gap: 6 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text, textAlign: "right" }}>
              {booking.car ? carTitle(booking.car) : "سيارة محذوفة"}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
              التسليم الحالي: {formatDate(booking.end_date)}
            </Text>
          </Card>

          <Card style={{ padding: 18, gap: 14 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
              كم يومًا إضافيًا؟
            </Text>
            <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
              {OPTIONS.map((n) => (
                <Chip
                  key={n}
                  label={countAr(n, DAYS_NOUN)}
                  active={extraDays === n}
                  onPress={() => setExtraDays(n)}
                />
              ))}
            </View>
            {newEnd ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                التسليم الجديد: {formatDate(newEnd)}
              </Text>
            ) : null}
          </Card>

          {quoting ? (
            <Skeleton width="100%" height={120} radius={radius.xl} />
          ) : quote && quote.ok ? (
            <Card style={{ padding: 18, gap: 10 }}>
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted }}>
                  {countAr(quote.days_added, DAYS_NOUN)} × {formatSar(quote.daily_rate)}
                </Text>
                <Text style={{ fontFamily: fonts.numeric, fontSize: 13, color: t.text }}>
                  {formatSar(quote.amount)}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}>
                منها ضريبة القيمة المضافة {formatSar(quote.vat_amount)}
              </Text>
              <View style={{ height: 1, backgroundColor: t.border }} />
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>
                  قيمة التمديد
                </Text>
                <Text style={{ fontFamily: fonts.numericBold, fontSize: 20, color: t.text }}>
                  {formatSar(quote.amount)}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted, textAlign: "right", lineHeight: 18 }}>
                يُصدر للتمديد فاتورة ضريبية مستقلة، ولا تتغيّر فاتورة حجزك الأصلي.
              </Text>
            </Card>
          ) : quote ? (
            <Card style={{ padding: 18, backgroundColor: t.dangerTint }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right", lineHeight: 21 }}>
                {extensionMessage(quote.reason)}
              </Text>
            </Card>
          ) : null}

          <Button
            label="أكّد التمديد"
            variant="accent"
            fullWidth
            loading={submitting}
            disabled={!quote || !quote.ok || quoting}
            onPress={onConfirm}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
