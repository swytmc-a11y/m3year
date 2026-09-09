import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, Redirect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, IconButton, Skeleton, useToast } from "@/components/kit";
import { ChevronBackIcon, DocumentIcon, ShieldIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { useAuth } from "@/contexts/auth";
import {
  fetchMyDocuments,
  saveMyDetails,
  pickAndUploadDocument,
  requestDocumentCheck,
  isDocumentsReady,
  isValidNationalId,
  type CustomerDocuments,
  type DocumentKind,
} from "@/lib/customer-documents";
import { fonts, radius } from "@/theme";

/**
 * Identity details and documents, asked for once before a customer's first
 * booking.
 *
 * Reached with ?next=<path> from the booking flow, so finishing here returns
 * the customer to the car they were trying to book rather than dropping them
 * on the home screen to start over.
 */
export default function MyDetailsScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();

  const [docs, setDocs] = useState<CustomerDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [uploading, setUploading] = useState<DocumentKind | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const d = await fetchMyDocuments();
    setDocs(d);
    setFullName(d?.full_name ?? "");
    setNationalId(d?.national_id ?? "");
    setLicenseNumber(d?.license_number ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
        <View style={{ padding: 18, gap: 16 }}>
          <Skeleton width="60%" height={24} />
          <Skeleton width="100%" height={140} radius={radius.lg} />
          <Skeleton width="100%" height={140} radius={radius.lg} />
        </View>
      </SafeAreaView>
    );
  }
  if (!session) return <Redirect href="/auth" />;

  async function onUpload(kind: DocumentKind) {
    setUploading(kind);
    const res = await pickAndUploadDocument(kind);
    setUploading(null);
    if (res.cancelled) return;
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    await load();
    toast("تم رفع المستند", "success");
  }

  async function onSubmit() {
    setSaving(true);

    const saved = await saveMyDetails({ fullName, nationalId, licenseNumber });
    if (saved.error) {
      setSaving(false);
      toast(saved.error, "error");
      return;
    }

    // Re-read rather than trusting local state: the upload may have happened
    // in an earlier visit, and the gate depends on what the server has.
    const fresh = await fetchMyDocuments();
    if (!fresh?.id_document_path || !fresh?.license_document_path) {
      setSaving(false);
      toast("ارفع صورة الهوية وصورة الرخصة أولًا.", "error");
      setDocs(fresh);
      return;
    }

    const check = await requestDocumentCheck();
    setSaving(false);

    if (check.error) {
      toast(check.error, "error");
      await load();
      return;
    }

    if (check.status === "rejected") {
      await load();
      toast(check.note || "الصور المرفوعة ليست مستندات صالحة.", "error");
      return;
    }

    toast("تم حفظ بياناتك", "success");
    if (next) router.replace(next as never);
    else router.back();
  }

  const rejected = docs?.documents_check === "rejected";
  const canSubmit =
    fullName.trim().length >= 2 &&
    isValidNationalId(nationalId) &&
    Boolean(docs?.id_document_path) &&
    Boolean(docs?.license_document_path) &&
    !saving;

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
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>بياناتي</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ padding: 18, gap: 8 }}>
          <Text
            style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}
          >
            نحتاج بياناتك قبل أول حجز
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12.5,
              lineHeight: 21,
              color: t.textMuted,
              textAlign: "right",
            }}
          >
            الفرع يطلب هويتك ورخصتك عند الاستلام، فنأخذها مرة واحدة الآن بدل كل
            حجز. مستنداتك محفوظة بشكل خاص ولا يطّلع عليها إلا فريق العمل.
          </Text>
        </Card>

        {rejected ? (
          <Card style={{ padding: 16, gap: 8, borderColor: t.danger, borderWidth: 1 }}>
            <Text
              style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: t.danger, textAlign: "right" }}
            >
              المستندات المرفوعة غير مقبولة
            </Text>
            <Text
              style={{ fontFamily: fonts.body, fontSize: 12.5, lineHeight: 20, color: t.textMuted, textAlign: "right" }}
            >
              {docs?.documents_check_note || "أعد رفع صور واضحة للهوية والرخصة."}
            </Text>
          </Card>
        ) : null}

        <Card style={{ padding: 18, gap: 14 }}>
          <Field
            label="الاسم كما في الهوية"
            value={fullName}
            onChangeText={setFullName}
            placeholder="الاسم الثلاثي"
            autoComplete="name"
          />
          <Field
            label="رقم الهوية أو الإقامة"
            value={nationalId}
            onChangeText={(v) => setNationalId(v.replace(/[^0-9]/g, "").slice(0, 10))}
            placeholder="١٠ أرقام"
            keyboardType="number-pad"
            numeric
            maxLength={10}
            error={
              nationalId.length > 0 && !isValidNationalId(nationalId)
                ? "رقم الهوية يتكوّن من ١٠ أرقام."
                : undefined
            }
          />
          <Field
            label="رقم الرخصة (اختياري)"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="إن وُجد"
            numeric
            hint="ليس مطلوبًا لإتمام الحجز."
          />
        </Card>

        <Card style={{ padding: 18, gap: 12 }}>
          <Text
            style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}
          >
            المستندات
          </Text>

          <UploadRow
            title="صورة الهوية أو الإقامة"
            uploaded={Boolean(docs?.id_document_path)}
            busy={uploading === "id"}
            onPress={() => onUpload("id")}
          />
          <UploadRow
            title="صورة رخصة القيادة"
            uploaded={Boolean(docs?.license_document_path)}
            busy={uploading === "license"}
            onPress={() => onUpload("license")}
          />

          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 2 }}>
            <ShieldIcon color={t.textMuted} size={14} />
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, flex: 1, textAlign: "right" }}>
              تُحفظ الصور بشكل خاص، ولا تظهر لأي عميل آخر.
            </Text>
          </View>
        </Card>

        <Button
          label={saving ? "جارٍ الحفظ..." : "حفظ ومتابعة"}
          onPress={onSubmit}
          disabled={!canSubmit}
          fullWidth
        />

        {isDocumentsReady(docs) && !rejected ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "center" }}>
            بياناتك مكتملة — يمكنك الحجز.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function UploadRow({
  title,
  uploaded,
  busy,
  onPress,
}: {
  title: string;
  uploaded: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: uploaded ? t.primary : t.border,
        backgroundColor: uploaded ? `${t.primary}0F` : t.surface,
      }}
    >
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, flex: 1 }}>
        <DocumentIcon color={uploaded ? t.primary : t.textMuted} size={18} />
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text, textAlign: "right" }}>
          {title}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.bodySemiBold,
          fontSize: 12,
          color: uploaded ? t.primary : t.textMuted,
        }}
      >
        {busy ? "جارٍ الرفع..." : uploaded ? "تغيير" : "رفع"}
      </Text>
    </Pressable>
  );
}
