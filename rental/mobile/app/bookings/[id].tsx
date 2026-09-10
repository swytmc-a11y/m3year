import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Linking, Alert, AppState } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Button, Card, IconButton, MenuCard, Skeleton, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { StatusPill } from "@/app/my-bookings";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import {
  fetchBooking,
  fetchBookingAddons,
  OPEN_STATUSES,
  type MyBooking,
  type BookingAddonLine,
} from "@/lib/bookings-data";
import { cancelMyBooking, startBookingPayment } from "@/lib/booking-actions";
import {
  listBookingExtensions,
  startExtensionPayment,
  type BookingExtension,
} from "@/lib/extensions";
import { listBookingInvoices, type Invoice } from "@/lib/invoices";
import { fetchBookingContract, contractUrl, type BookingContract } from "@/lib/contracts";
import {
  formatSar,
  formatDate,
  carTitle,
  RATE_TIER_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import { countAr, DAYS_NOUN } from "@/lib/arabic";
import { fonts, radius } from "@/theme";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [addons, setAddons] = useState<BookingAddonLine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contract, setContract] = useState<BookingContract | null>(null);
  const [extensions, setExtensions] = useState<BookingExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payingExtension, setPayingExtension] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [b, a, inv, c, ext] = await Promise.all([
      fetchBooking(id),
      fetchBookingAddons(id),
      listBookingInvoices(id),
      fetchBookingContract(id),
      listBookingExtensions(id),
    ]);
    setBooking(b);
    setAddons(a);
    setInvoices(inv);
    setContract(c);
    setExtensions(ext);
    setLoading(false);
  }, [id]);

  // Payment happens on the provider's own page in an external browser, so
  // the app is backgrounded while it completes. Coming back does not
  // re-focus this screen in the navigator's sense, so without this the
  // customer returns to the very screen that told them the status would be
  // updated and still sees "pay now".
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") reload();
    });
    return () => sub.remove();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [b, a, inv, c, ext] = await Promise.all([
          fetchBooking(id),
          fetchBookingAddons(id),
          listBookingInvoices(id),
          fetchBookingContract(id),
          listBookingExtensions(id),
        ]);
        if (!active) return;
        setBooking(b);
        setAddons(a);
        setInvoices(inv);
        setContract(c);
        setExtensions(ext);
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [id]),
  );

  if (authLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!session) return <Redirect href="/auth" />;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <View style={{ padding: 18, gap: 16 }}>
          <Skeleton width="50%" height={22} />
          <Skeleton width="100%" height={200} radius={radius.xl} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted }}>
            الحجز غير موجود.
          </Text>
          <Button label="حجوزاتي" variant="secondary" onPress={() => router.replace("/my-bookings")} />
        </View>
      </SafeAreaView>
    );
  }

  const canCancel = OPEN_STATUSES.includes(booking.status);
  const canExtend = booking.status === "confirmed" || booking.status === "active";
  const needsPayment =
    booking.status === "pending_payment" && booking.payment_status === "unpaid";

  async function onPay() {
    setPaying(true);
    const res = await startBookingPayment(booking!.id);
    setPaying(false);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    // Moyasar hosts the card form, so nothing sensitive ever enters the app.
    await Linking.openURL(res.paymentUrl!);
  }

  async function onPayExtension(extensionId: string) {
    setPayingExtension(extensionId);
    const res = await startExtensionPayment(extensionId);
    setPayingExtension(null);
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    await Linking.openURL(res.paymentUrl!);
  }

  function onCancel() {
    Alert.alert(
      "إلغاء الحجز",
      "سيتم إلغاء الحجز. إن كان مدفوعًا فسيُرفع طلب استرداد للمبلغ.",
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "إلغاء الحجز",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            const res = await cancelMyBooking(booking!.id);
            setCancelling(false);
            if (res.error) toast(res.error, "error");
            else {
              toast("أُلغي الحجز.", "success");
              await reload();
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>تفاصيل الحجز</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 40 }}>
        <Card style={{ padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            {/* The reference is what branch staff search by over the phone,
                so it gets the most prominent treatment on the screen. */}
            <Text style={{ fontFamily: fonts.numericBold, fontSize: 20, color: t.primary }}>
              {booking.reference}
            </Text>
            <StatusPill status={booking.status} />
          </View>

          <View style={{ flexDirection: "row-reverse", gap: 14, alignItems: "center" }}>
            {booking.car?.cover_image ? (
              <Image
                source={{ uri: booking.car.cover_image }}
                style={{ width: 96, height: 68, borderRadius: radius.lg, backgroundColor: t.surface2 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text, textAlign: "right" }}>
                {booking.car ? carTitle(booking.car) : "سيارة محذوفة"}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", marginTop: 2 }}>
                {booking.branch ? `${booking.branch.name} — ${booking.branch.city}` : ""}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ padding: 18, gap: 12 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
            المدة
          </Text>
          <Row label="الاستلام" value={`${formatDate(booking.start_date)} · ${booking.pickup_time.slice(0, 5)}`} />
          <Row label="التسليم" value={`${formatDate(booking.end_date)} · ${booking.return_time.slice(0, 5)}`} />
          <Row label="المدة" value={countAr(booking.days, DAYS_NOUN)} />
        </Card>

        <Card style={{ padding: 18, gap: 10 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
            الفاتورة
          </Text>
          <Row
            label={`${countAr(booking.days, DAYS_NOUN)} × ${formatSar(Number(booking.daily_rate))} (${RATE_TIER_LABELS[booking.rate_tier]})`}
            value={formatSar(Number(booking.rental_total))}
          />
          {addons.map((a) => (
            <Row key={a.addon_id} label={a.name} value={formatSar(Number(a.total))} muted />
          ))}
          <Row label="منها ضريبة القيمة المضافة" value={formatSar(Number(booking.vat_amount))} muted />
          <View style={{ height: 1, backgroundColor: t.border, marginVertical: 4 }} />
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>الإجمالي</Text>
            <Text style={{ fontFamily: fonts.numericBold, fontSize: 20, color: t.text }}>
              {formatSar(Number(booking.total))}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}>
            حالة الدفع: {PAYMENT_STATUS_LABELS[booking.payment_status]}
          </Text>
        </Card>

        {booking.cancellation_reason ? (
          <Card style={{ padding: 18, backgroundColor: t.dangerTint }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right", lineHeight: 21 }}>
              {booking.cancellation_reason}
            </Text>
          </Card>
        ) : null}

        {booking.branch ? (
          <Card style={{ padding: 18, gap: 12 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
              الفرع
            </Text>
            {booking.branch.address ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
                {booking.branch.address}
              </Text>
            ) : null}
            {booking.branch.deposit_note ? (
              <View style={{ backgroundColor: t.surface2, borderRadius: radius.lg, padding: 12 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 19 }}>
                  {booking.branch.deposit_note}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row-reverse", gap: 10 }}>
              {booking.branch.phone ? (
                <Button label="اتصال" variant="secondary" onPress={() => Linking.openURL(`tel:${booking.branch!.phone}`)} />
              ) : null}
              {booking.branch.whatsapp ? (
                <Button
                  label="واتساب"
                  variant="secondary"
                  onPress={() =>
                    Linking.openURL(`https://wa.me/${booking.branch!.whatsapp!.replace(/[^0-9]/g, "")}`)
                  }
                />
              ) : null}
            </View>
          </Card>
        ) : null}

        {needsPayment ? (
          <View style={{ gap: 8 }}>
            <Button
              label={`ادفع ${formatSar(Number(booking.total))}`}
              fullWidth
              loading={paying}
              onPress={onPay}
            />
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "center", lineHeight: 19 }}>
              الدفع عبر صفحة آمنة من مزوّد الدفع. بعد إتمامه ارجع للتطبيق وستجد الحالة محدّثة.
            </Text>
          </View>
        ) : null}

        {/* A committed-but-unpaid extension is real: the dates already moved
            and the car is already held for them, independent of payment. If
            the customer closes the payment page mid-flow this is the only
            place they can come back and finish it — the extend screen opens
            the same payment page once and does not remember it afterward. */}
        {extensions
          .filter((e) => e.payment_status === "unpaid")
          .map((ext) => (
            <View key={ext.id} style={{ gap: 8 }}>
              <Card style={{ padding: 16, gap: 4 }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text, textAlign: "right" }}>
                  تمديد حتى {formatDate(ext.new_end_date)}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right" }}>
                  {countAr(ext.days_added, DAYS_NOUN)} إضافية — بانتظار الدفع
                </Text>
              </Card>
              <Button
                label={`ادفع تمديد الحجز ${formatSar(ext.amount)}`}
                fullWidth
                loading={payingExtension === ext.id}
                onPress={() => onPayExtension(ext.id)}
              />
            </View>
          ))}

        {/* Everything the rental produced as paper: the tax invoice for the
            booking, one more for each paid extension, and the signed
            contract once the branch has handed the car over. */}
        {invoices.length > 0 || contract ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
              المستندات
            </Text>
            <MenuCard
              items={[
                ...invoices.map((inv) => ({
                  label: inv.extension_id
                    ? `فاتورة التمديد ${inv.number}`
                    : `الفاتورة الضريبية ${inv.number}`,
                  onPress: () => router.push(`/invoice/${inv.id}`),
                })),
                ...(contract
                  ? [
                      {
                        label: "عقد الإيجار",
                        onPress: async () => {
                          const url = await contractUrl(contract.storage_path);
                          if (url) await Linking.openURL(url);
                          else toast("تعذّر فتح العقد.", "error");
                        },
                      },
                    ]
                  : []),
              ]}
            />
          </View>
        ) : null}

        {canExtend ? (
          <Button
            label="تمديد الحجز"
            variant="secondary"
            fullWidth
            onPress={() => router.push(`/bookings/${booking!.id}/extend`)}
          />
        ) : null}

        {canCancel ? (
          <Button label="إلغاء الحجز" variant="danger" fullWidth loading={cancelling} onPress={onCancel} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: muted ? t.textMuted : t.text, flex: 1, textAlign: "right" }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.numeric, fontSize: 13, color: muted ? t.textMuted : t.text }}>{value}</Text>
    </View>
  );
}
