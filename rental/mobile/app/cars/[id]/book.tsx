import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Switch } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, CheckRow, Chip, IconButton, Skeleton, useToast } from "@/components/kit";
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
import {
  listDeliveryZones,
  estimateDeliveryFee,
  EMPTY_DELIVERY,
  type DeliveryZone,
  type DeliveryChoice,
} from "@/lib/delivery";
import { fetchWalletBalance, fetchWalletSettings, type WalletSettings } from "@/lib/wallet";
import { DateRangeCalendar } from "@/components/date-range-calendar";
import { daysBetween } from "@/lib/dates";
import {
  fetchMyDocuments,
  isDocumentsReady,
  type CustomerDocuments,
} from "@/lib/customer-documents";
import { formatSar, carTitle, RATE_TIER_LABELS } from "@/lib/constants";
import { countAr, DAYS_NOUN } from "@/lib/arabic";
import { fonts, radius } from "@/theme";

/** yyyy-mm-dd for a date N days from today, in local time. */
function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TIMES = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

export default function BookCarScreen() {
  // from/to arrive when the customer already picked dates while browsing —
  // re-asking for them here would throw away a choice they just made.
  const { id, from, to } = useLocalSearchParams<{ id: string; from?: string; to?: string }>();
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();

  const [car, setCar] = useState<CarDetail | null>(null);
  const [addons, setAddons] = useState<CarAddon[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableRange[]>([]);
  const [docs, setDocs] = useState<CustomerDocuments | null>(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(from ?? isoDay(1));
  // Genuinely nullable: "no return date chosen yet" and "return date equals
  // pickup date" must stay distinguishable, or the calendar cannot tell a
  // fresh pickup pick from a completed range and starts a new selection on
  // every second tap instead of completing the one in progress.
  const [endDate, setEndDate] = useState<string | null>(to ?? isoDay(4));
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");

  // Shown the moment the range is picked, without waiting for the server
  // quote — the customer should not have to scroll to the total to learn how
  // long they just selected.
  const selectedDays = endDate && endDate > startDate ? daysBetween(startDate, endDate) : 0;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // couponInput is what is being typed; appliedCoupon is what the quote was
  // priced with. Keeping them apart stops every keystroke from re-pricing.
  const [couponInput, setCouponInput] = useState("");

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [delivery, setDelivery] = useState<DeliveryChoice>(EMPTY_DELIVERY);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletSettings, setWalletSettings] = useState<WalletSettings | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delivery zones depend on which branch owns the car, and the wallet on
  // who is signed in, so both load once the car is known.
  useEffect(() => {
    if (!car?.branch?.id) return;
    let active = true;
    (async () => {
      const [z, b, s] = await Promise.all([
        listDeliveryZones(car.branch!.id),
        fetchWalletBalance(),
        fetchWalletSettings(),
      ]);
      if (!active) return;
      setZones(z);
      setWalletBalance(b);
      setWalletSettings(s);
    })();
    return () => {
      active = false;
    };
  }, [car?.branch?.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      // The same details the database requires to accept a booking are
      // fetched alongside the car, so an incomplete customer is sent to fill
      // them in rather than getting a rejection at the end of the flow.
      const [res, mine] = await Promise.all([fetchCarDetail(id), fetchMyDocuments()]);
      if (!active) return;
      setCar(res.car);
      setAddons(res.addons);
      setUnavailable(res.unavailable);
      setDocs(mine);
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
    if (!endDate) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
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
    const { quote: q, error } = await quoteBooking(
      car.id,
      startDate,
      endDate,
      selected,
      appliedCoupon,
    );
    setQuoting(false);
    setQuote(q ?? null);
    setQuoteError(error ?? null);
  }, [car, startDate, endDate, selected, unavailable, appliedCoupon]);

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
  if (!isDocumentsReady(docs)) {
    return <Redirect href={`/my-details?next=/cars/${id}/book`} />;
  }

  // What the delivery and the wallet will add and take off. Both are shown
  // here and decided by the server on insert; this only has to agree with it.
  const deliveryFee = estimateDeliveryFee(delivery, zones);
  const payableBeforeWallet = quote ? quote.total + deliveryFee : 0;
  const walletEligible =
    useWallet &&
    walletBalance > 0 &&
    payableBeforeWallet >= (walletSettings?.min_booking_total_to_redeem ?? 0);
  const walletApplied = walletEligible
    ? Math.min(
        walletBalance,
        payableBeforeWallet,
        (payableBeforeWallet * (walletSettings?.max_redeem_percent ?? 100)) / 100,
      )
    : 0;
  const grandTotal = Math.max(payableBeforeWallet - walletApplied, 0);

  async function onSubmit() {
    // A quote only ever exists for a complete, valid range, so endDate is
    // guaranteed non-null here — but TypeScript can't see that correlation.
    if (!car || !quote || !endDate) return;
    setSubmitting(true);
    const res = await createBooking({
      carId: car.id,
      branchId: car.branch!.id,
      startDate,
      endDate,
      pickupTime,
      returnTime,
      quote,
      // Only send a code the server already accepted while quoting; a
      // rejected one would just be dropped again on insert.
      couponCode: quote.coupon?.valid ? quote.coupon.code : null,
      note: note.trim() || null,
      confirmationMode: car.confirmation_mode,
      delivery,
      useWallet,
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
              // Passed through as-is, null included: the calendar tells a
              // fresh pickup pick (end: null) apart from a completed range
              // only if that null survives the round trip. Coercing it to
              // the pickup date here previously made every second tap look
              // like a already-complete range and start over instead of
              // completing it.
              setEndDate(next.end);
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
            {endDate && selectedDays > 0 ? (
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: t.text }}>
                  {startDate} ← {endDate}
                </Text>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.primary }}>
                  {countAr(selectedDays, DAYS_NOUN)}
                </Text>
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                {endDate ? "اختر تاريخ تسليم بعد تاريخ الاستلام." : "اختر تاريخ الاستلام ثم تاريخ التسليم من التقويم."}
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

        {zones.length > 0 ? (
          <Card style={{ padding: 18, gap: 14 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
              الاستلام والتسليم
            </Text>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                الاستلام
              </Text>
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                <Chip
                  label="من الفرع"
                  active={delivery.deliveryMode === "branch"}
                  onPress={() => setDelivery((d) => ({ ...d, deliveryMode: "branch" }))}
                />
                <Chip
                  label="وصّلوها لي"
                  active={delivery.deliveryMode === "delivery"}
                  onPress={() => setDelivery((d) => ({ ...d, deliveryMode: "delivery" }))}
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                التسليم
              </Text>
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                <Chip
                  label="أعيدها للفرع"
                  active={delivery.returnMode === "branch"}
                  onPress={() => setDelivery((d) => ({ ...d, returnMode: "branch" }))}
                />
                <Chip
                  label="استلموها مني"
                  active={delivery.returnMode === "pickup"}
                  onPress={() => setDelivery((d) => ({ ...d, returnMode: "pickup" }))}
                />
              </View>
            </View>

            {/* Only asked for once a leg actually needs an address — a form
                that demands one for a counter pickup is asking for nothing. */}
            {delivery.deliveryMode === "delivery" || delivery.returnMode === "pickup" ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                  المنطقة
                </Text>
                <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
                  {zones.map((z) => (
                    <Chip
                      key={z.id}
                      label={`${z.name} · ${formatSar(z.fee)}`}
                      active={delivery.zoneId === z.id}
                      onPress={() => setDelivery((d) => ({ ...d, zoneId: z.id }))}
                    />
                  ))}
                </View>
                <TextInput
                  value={delivery.address}
                  onChangeText={(v) => setDelivery((d) => ({ ...d, address: v }))}
                  placeholder="العنوان بالتفصيل"
                  placeholderTextColor={t.textMuted}
                  style={{
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: radius.lg,
                    padding: 12,
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: t.text,
                    textAlign: "right",
                    backgroundColor: t.surface,
                  }}
                />
              </View>
            ) : null}
          </Card>
        ) : null}

        {walletBalance > 0 ? (
          <Card style={{ padding: 18, gap: 8 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
                  استخدم رصيد المحفظة
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "right", marginTop: 2 }}>
                  رصيدك {formatSar(walletBalance)}
                </Text>
              </View>
              <Switch
                value={useWallet}
                onValueChange={setUseWallet}
                trackColor={{ true: t.primary, false: t.border }}
              />
            </View>
            {useWallet && !walletEligible ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 19 }}>
                الحد الأدنى لاستخدام الرصيد {formatSar(walletSettings?.min_booking_total_to_redeem ?? 0)}.
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Card style={{ padding: 18, gap: 10 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
            رمز الخصم
          </Text>

          <View style={{ flexDirection: "row-reverse", gap: 8, alignItems: "center" }}>
            <TextInput
              value={couponInput}
              onChangeText={(v) => setCouponInput(v.toUpperCase().replace(/\s/g, ""))}
              placeholder="أدخل الرمز"
              placeholderTextColor={t.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!appliedCoupon}
              style={{
                flex: 1,
                height: 44,
                paddingHorizontal: 14,
                backgroundColor: t.surface2,
                borderRadius: radius.md,
                fontFamily: fonts.numeric,
                fontSize: 14,
                color: appliedCoupon ? t.textMuted : t.text,
                textAlign: "right",
              }}
            />
            <Button
              label={appliedCoupon ? "إزالة" : "تطبيق"}
              variant="secondary"
              onPress={() => {
                if (appliedCoupon) {
                  setAppliedCoupon(null);
                  setCouponInput("");
                  return;
                }
                if (couponInput.trim()) setAppliedCoupon(couponInput.trim());
              }}
              disabled={!appliedCoupon && !couponInput.trim()}
            />
          </View>

          {/* The verdict comes back attached to the quote, so an invalid
              code is explained rather than silently ignored. */}
          {quote?.coupon && !quote.coupon.valid ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.danger, textAlign: "right" }}>
              {quote.coupon.message}
            </Text>
          ) : quote?.coupon?.valid ? (
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: t.success, textAlign: "right" }}>
              {quote.coupon.description ?? `طُبّق الرمز ${quote.coupon.code}`}
            </Text>
          ) : null}
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
                label={`${countAr(quote.days, DAYS_NOUN)} × ${formatSar(quote.daily_rate)} (${RATE_TIER_LABELS[quote.rate_tier]})`}
                value={formatSar(quote.rental_total)}
              />
              {quote.addons.map((a) => (
                <Line key={a.addon_id} label={a.name} value={formatSar(a.total)} muted />
              ))}
              {quote.discount_amount > 0 ? (
                <View
                  style={{
                    flexDirection: "row-reverse",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.success }}>
                    خصم {quote.coupon?.valid ? quote.coupon.code : ""}
                  </Text>
                  <Text style={{ fontFamily: fonts.numericBold, fontSize: 14, color: t.success }}>
                    −{formatSar(quote.discount_amount)}
                  </Text>
                </View>
              ) : null}
              {deliveryFee > 0 ? (
                <Line label="التوصيل والاستلام" value={formatSar(deliveryFee)} muted />
              ) : null}
              {/* Recomputed rather than taken from the quote: the quote was
                  priced before delivery was added and the wallet applied, so
                  its own vat_amount no longer describes this total. VAT here
                  is inclusive, matching how the server extracts it. */}
              <Line
                label="منها ضريبة القيمة المضافة"
                value={formatSar(grandTotal - grandTotal / (1 + quote.vat_rate))}
                muted
              />
              {walletApplied > 0 ? (
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.success }}>
                    من رصيد المحفظة
                  </Text>
                  <Text style={{ fontFamily: fonts.numericBold, fontSize: 14, color: t.success }}>
                    −{formatSar(walletApplied)}
                  </Text>
                </View>
              ) : null}
              <View style={{ height: 1, backgroundColor: t.border, marginVertical: 4 }} />
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>
                  الإجمالي شامل الضريبة
                </Text>
                <Text style={{ fontFamily: fonts.numericBold, fontSize: 20, color: t.text }}>
                  {formatSar(grandTotal)}
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
