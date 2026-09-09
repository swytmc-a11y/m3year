import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, CheckRow, IconButton, Skeleton, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { useAuth } from "@/contexts/auth";
import {
  fetchCarDetail,
  quoteBooking,
  isRangeAvailable,
  type CarDetail,
  type CarAddon,
  type Quote,
  type UnavailableRange,
} from "@/lib/car-detail";
import { createBooking } from "@/lib/booking-actions";
import { DateRangeCalendar } from "@/components/date-range-calendar";
import { daysBetween } from "@/lib/dates";
import { formatSar, carTitle, RATE_TIER_LABELS } from "@/lib/constants";
import { fonts, radius } from "@/theme";

/** yyyy-mm-dd for a date N days from today, in local time. */
function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TIMES = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

export default function BookCarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();

  const [car, setCar] = useState<CarDetail | null>(null);
  const [addons, setAddons] = useState<CarAddon[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableRange[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(isoDay(1));
  const [endDate, setEndDate] = useState(isoDay(4));
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");

  // Shown the moment the range is picked, without waiting for the server
  // quote — the customer should not have to scroll to the total to learn how
  // long they just selected.
  const selectedDays = endDate > startDate ? daysBetween(startDate, endDate) : 0;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchCarDetail(id);
      if (!active) return;
      setCar(res.car);
      setAddons(res.addons);
      setUnavailable(res.unavailable);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Every change re-prices on the server rather than in the client, so the
  // figure shown is the figure that will be charged.
  const reprice = useCallback(async () => {
    if (!car) return;
    if (endDate <= startDate) {
      setQuote(null);
      setQuoteError("اختر تاريخ تسليم بعد تاريخ الاستلام.");
      return;
    }
    if (!isRangeAvailable(startDate, endDate, unavailable)) {
      setQuote(null);
      setQuoteError("السيارة محجوزة في جزء من هذه الفترة. اختر تواريخ أخرى.");
      return;
    }
    setQuoting(true);
    const { quote: q, error } = await quoteBooking(car.id, startDate, endDate, selected);
    setQuoting(false);
    setQuote(q ?? null);
    setQuoteError(error ?? null);
  }, [car, startDate, endDate, selected, unavailable]);

  useEffect(() => {
    reprice();
  }, [reprice]);

  if (authLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <View style={{ padding: 18, gap: 16 }}>
          <Skeleton width="60%" height={24} />
          <Skeleton width="100%" height={180} radius={radius.lg} />
        </View>
      </SafeAreaView>
    );
  }
  if (!session) return <Redirect href="/auth" />;
  if (!car) return <Redirect href="/" />;

  async function onSubmit() {
    if (!car || !quote) return;
    setSubmitting(true);
    const res = await createBooking({
      carId: car.id,
      branchId: car.branch!.id,
      startDate,
      endDate,
      pickupTime,
      returnTime,
      quote,
      note: note.trim() || null,
      confirmationMode: car.confirmation_mode,
    });
    setSubmitting(false);

    if (res.error) {
      toast(res.error, "error");
      // The dates may have just been taken, so refresh what is blocked.
      const fresh = await fetchCarDetail(car.id);
      setUnavailable(fresh.unavailable);
      return;
    }

    toast(`تم إنشاء الحجز ${res.reference}`, "success");
    router.replace(`/bookings/${res.bookingId}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>
          حجز {carTitle(car)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card style={{ padding: 18, gap: 14 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
            مدة الإيجار
          </Text>

          <DateRangeCalendar
            range={{ start: startDate, end: endDate }}
            onChange={(next) => {
              setStartDate(next.start);
              // While only the pickup day is chosen there is no period to
              // price yet, so the return date follows the pickup and the
              // summary below asks for the second tap instead of quoting a
              // number that is about to change.
              setEndDate(next.end ?? next.start);
            }}
            unavailable={unavailable}
          />

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: t.border,
              paddingTop: 12,
              gap: 8,
            }}
          >
            {selectedDays > 0 ? (
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: t.text }}>
                  {startDate} ← {endDate}
                </Text>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.primary }}>
                  {selectedDays} {selectedDays === 1 ? "يوم" : selectedDays === 2 ? "يومان" : "أيام"}
                </Text>
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                اختر تاريخ الاستلام ثم تاريخ التسليم من التقويم.
              </Text>
            )}
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}>
              يوم التسليم غير محتسب — من ١ إلى ٣ يعني يومين. الأيام المشطوبة محجوزة.
            </Text>
          </View>

          <TimeRow label="وقت الاستلام" value={pickupTime} onChange={setPickupTime} />
          <TimeRow label="وقت التسليم" value={returnTime} onChange={setReturnTime} />
        </Card>

        {addons.length > 0 ? (
          <Card style={{ padding: 18, gap: 6 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right", marginBottom: 6 }}>
              خدمات إضافية
            </Text>
            {addons.map((a) => (
              <CheckRow
                key={a.addon_id}
                label={`${a.name} — ${formatSar(a.price)}${a.pricing_type === "per_day" ? " / يوم" : ""}`}
                checked={selected.includes(a.addon_id)}
                onPress={() =>
                  setSelected((prev) =>
                    prev.includes(a.addon_id)
                      ? prev.filter((x) => x !== a.addon_id)
                      : [...prev, a.addon_id],
                  )
                }
              />
            ))}
          </Card>
        ) : null}

        <Card style={{ padding: 18, gap: 10 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
            ملاحظة للفرع (اختياري)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="مثال: أحتاج كرسي أطفال"
            placeholderTextColor={t.textMuted}
            multiline
            maxLength={300}
            style={{
              minHeight: 80,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: radius.lg,
              backgroundColor: t.surface,
              padding: 12,
              fontFamily: fonts.body,
              fontSize: 13.5,
              color: t.text,
              textAlign: "right",
              textAlignVertical: "top",
            }}
          />
        </Card>

        {/* The quote comes from the server on every change, so what is shown
            here is exactly what gets charged. */}
        <Card style={{ padding: 18, gap: 12 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
            الإجمالي
          </Text>

          {quoting ? (
            <Skeleton width="100%" height={90} radius={radius.lg} />
          ) : quoteError ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right", lineHeight: 21 }}>
              {quoteError}
            </Text>
          ) : quote ? (
            <View style={{ gap: 8 }}>
              <Line
                label={`${quote.days} يوم × ${formatSar(quote.daily_rate)} (${RATE_TIER_LABELS[quote.rate_tier]})`}
                value={formatSar(quote.rental_total)}
              />
              {quote.addons.map((a) => (
                <Line key={a.addon_id} label={a.name} value={formatSar(a.total)} muted />
              ))}
              <Line label="منها ضريبة القيمة المضافة" value={formatSar(quote.vat_amount)} muted />
              <View style={{ height: 1, backgroundColor: t.border, marginVertical: 4 }} />
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>
                  الإجمالي شامل الضريبة
                </Text>
                <Text style={{ fontFamily: fonts.numericBold, fontSize: 20, color: t.text }}>
                  {formatSar(quote.total)}
                </Text>
              </View>
            </View>
          ) : null}

          {car.branch?.deposit_note ? (
            <View style={{ backgroundColor: t.surface2, borderRadius: radius.lg, padding: 12 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 19 }}>
                {car.branch.deposit_note}
              </Text>
            </View>
          ) : null}

          <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 19 }}>
            {car.confirmation_mode === "instant"
              ? "يتأكد الحجز فور إتمام الدفع."
              : "يصل طلبك للفرع للتأكيد قبل الدفع."}
          </Text>
        </Card>

        <Button
          label={submitting ? "جارٍ الإرسال..." : "تأكيد الحجز"}
          fullWidth
          loading={submitting}
          disabled={!quote || Boolean(quoteError) || quoting}
          onPress={onSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: muted ? t.textMuted : t.text, flex: 1, textAlign: "right" }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.numeric, fontSize: 13, color: muted ? t.textMuted : t.text }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Plain yyyy-mm-dd entry. A native picker would be nicer, but this keeps the
 * screen working identically on both platforms and in Expo Go, and the
 * server rejects anything malformed anyway.
 */
function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: t.text, textAlign: "right" }}>
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>
        {TIMES.map((time) => {
          const active = value === time;
          return (
            <Text
              key={time}
              onPress={() => onChange(time)}
              style={{
                fontFamily: fonts.numeric,
                fontSize: 13,
                color: active ? t.onPrimary : t.textMuted,
                backgroundColor: active ? t.primary : t.surface2,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.pill,
                overflow: "hidden",
              }}
            >
              {time}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}
