import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { Card, IconButton, Skeleton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { fetchInvoice, type Invoice } from "@/lib/invoices";
import { formatSar, AR_MONTHS } from "@/lib/constants";
import { fonts, radius } from "@/theme";

/** "10 سبتمبر 2026 · 14:32" — an invoice needs the time, not just the day. */
function issuedAt(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}`;
}

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTheme();
  const { session, loading: authLoading } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const inv = await fetchInvoice(id);
      if (!active) return;
      setInvoice(inv);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (authLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!session) return <Redirect href="/auth" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>
          فاتورة ضريبية مبسطة
        </Text>
      </View>

      {loading ? (
        <View style={{ padding: 18, gap: 14 }}>
          <Skeleton width="100%" height={180} radius={radius.xl} />
          <Skeleton width="100%" height={220} radius={radius.xl} />
        </View>
      ) : !invoice ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted }}>
            الفاتورة غير متاحة.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }}>
          <Card style={{ padding: 20, gap: 12 }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: t.text, textAlign: "center" }}>
                {invoice.seller_name}
              </Text>
              {invoice.seller_address ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "center" }}>
                  {invoice.seller_address}
                </Text>
              ) : null}
            </View>
            <Row label="الرقم الضريبي" value={invoice.seller_vat_number || "—"} />
            {invoice.seller_cr_number ? (
              <Row label="السجل التجاري" value={invoice.seller_cr_number} />
            ) : null}
            <View style={{ height: 1, backgroundColor: t.border }} />
            <Row label="رقم الفاتورة" value={invoice.number} strong />
            <Row label="تاريخ الإصدار" value={issuedAt(invoice.issued_at)} />
            {invoice.buyer_name ? <Row label="العميل" value={invoice.buyer_name} /> : null}
          </Card>

          <Card style={{ padding: 20, gap: 10 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
              التفاصيل
            </Text>
            <Row label="قيمة الإيجار" value={formatSar(invoice.rental_total)} />
            {invoice.lines.map((line, i) => (
              <Row key={`${line.name}-${i}`} label={line.name} value={formatSar(Number(line.total))} muted />
            ))}
            {invoice.discount_amount > 0 ? (
              <Row label="خصم الكوبون" value={`− ${formatSar(invoice.discount_amount)}`} muted />
            ) : null}
            {invoice.wallet_amount > 0 ? (
              <Row label="خصم من المحفظة" value={`− ${formatSar(invoice.wallet_amount)}`} muted />
            ) : null}

            <View style={{ height: 1, backgroundColor: t.border, marginVertical: 4 }} />
            <Row
              label={`ضريبة القيمة المضافة (${Math.round(invoice.vat_rate * 100)}%)`}
              value={formatSar(invoice.vat_amount)}
              muted
            />
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>
                الإجمالي شامل الضريبة
              </Text>
              <Text style={{ fontFamily: fonts.numericBold, fontSize: 20, color: t.text }}>
                {formatSar(invoice.total)}
              </Text>
            </View>
          </Card>

          {/* The QR is the part a ZATCA reader scans. It has to be on a white
              field with a real quiet zone regardless of theme — a code drawn
              on the dark surface will not scan. */}
          <Card style={{ padding: 20, gap: 12, alignItems: "center" }}>
            <View style={{ backgroundColor: "#FFFFFF", padding: 14, borderRadius: radius.lg }}>
              <QRCode value={invoice.qr_base64} size={168} backgroundColor="#FFFFFF" color="#000000" />
            </View>
            <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted, textAlign: "center", lineHeight: 18 }}>
              رمز الاستجابة السريعة وفق متطلبات هيئة الزكاة والضريبة والجمارك.
            </Text>
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: muted ? t.textMuted : t.text, flex: 1, textAlign: "right" }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: strong ? fonts.numericBold : fonts.numeric,
          fontSize: strong ? 14 : 12.5,
          color: muted ? t.textMuted : t.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
