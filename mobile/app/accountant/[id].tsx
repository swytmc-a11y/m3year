import { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect, Redirect, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { TopBar, Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import {
  claimVerificationRequest,
  completeVerification,
  rejectVerification,
  type VerificationRequestRow,
} from "@/lib/accountant-actions";
import { getVerificationDocSignedUrl } from "@/lib/storage";
import { formatSar, type Listing } from "@/lib/constants";
import type { Franchise } from "@/lib/franchise-constants";
import { colors, fonts } from "@/theme";

export default function AccountantRequestScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, user, loading: authLoading } = useAuth();

  const [request, setRequest] = useState<VerificationRequestRow | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [verifiedRevenue, setVerifiedRevenue] = useState("");
  const [notes, setNotes] = useState("");
  const [openingDoc, setOpeningDoc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: req } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("id", String(id))
      .maybeSingle();
    setRequest(req as VerificationRequestRow | null);
    if (req?.listing_id) {
      const { data: l } = await supabase
        .from("listings")
        .select("*")
        .eq("id", req.listing_id)
        .maybeSingle();
      setListing(l);
    } else if (req?.franchise_id) {
      const { data: f } = await supabase
        .from("franchises")
        .select("*")
        .eq("id", req.franchise_id)
        .maybeSingle();
      setFranchise(f);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [load, session]),
  );

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  const isMine = request?.accountant_id === user?.id;
  const isOpen = request?.accountant_id === null && request?.status === "requested";

  async function onClaim() {
    if (!request) return;
    setError(undefined);
    setBusy(true);
    const { error: err } = await claimVerificationRequest(request.id);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    load();
  }

  async function onComplete() {
    if (!request) return;
    const revenue = Number(verifiedRevenue);
    if (!verifiedRevenue || Number.isNaN(revenue) || revenue < 0) {
      setError("أدخل الإيراد المُوثّق كرقم صحيح.");
      return;
    }
    setError(undefined);
    setBusy(true);
    const { error: err } = await completeVerification(request.id, revenue, notes || null);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace("/accountant");
  }

  async function onOpenFinancialStatement() {
    if (!request?.financial_statement_path) return;
    setOpeningDoc(true);
    const url = await getVerificationDocSignedUrl(request.financial_statement_path);
    setOpeningDoc(false);
    if (!url) {
      setError("تعذّر فتح الملف الآن.");
      return;
    }
    Linking.openURL(url);
  }

  async function onReject() {
    if (!request) return;
    if (notes.trim().length < 3) {
      setError("اكتب سبب الرفض.");
      return;
    }
    setError(undefined);
    setBusy(true);
    const { error: err } = await rejectVerification(request.id, notes.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace("/accountant");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title="طلب توثيق" onBack={() => router.back()} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : !request || (!listing && !franchise) ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.mutedText }}>
            الطلب غير موجود أو لا تملك صلاحية عرضه.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Card style={{ gap: 8 }}>
            {listing ? (
              <>
                <Link href={`/listings/${listing.id}`}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink, textAlign: "right" }}>
                    {listing.title}
                  </Text>
                </Link>
                <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "right" }}>
                  الإيراد الشهري المُصرَّح به: {formatSar(listing.monthly_revenue)}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, textAlign: "right" }}>
                  المدينة: {listing.city}
                </Text>
              </>
            ) : franchise ? (
              <>
                <Link href={`/franchises/${franchise.id}`}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink, textAlign: "right" }}>
                    {franchise.brand_name}
                  </Text>
                </Link>
                <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "right" }}>
                  رسوم الامتياز المُصرَّح بها: {formatSar(franchise.franchise_fee)}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, textAlign: "right" }}>
                  المدينة: {franchise.city}
                </Text>
              </>
            ) : null}
          </Card>

          {isOpen ? (
            <Button label="استلام هذا الطلب" fullWidth loading={busy} onPress={onClaim} />
          ) : isMine && (request.status === "in_review" || request.status === "assigned") ? (
            <Card style={{ gap: 14 }}>
              {request.financial_statement_path ? (
                <Button
                  label="فتح القوائم المالية المرفوعة"
                  variant="ghost"
                  fullWidth
                  loading={openingDoc}
                  onPress={onOpenFinancialStatement}
                />
              ) : (
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, textAlign: "right" }}>
                  لم يرفع صاحب المشروع القوائم المالية بعد.
                </Text>
              )}
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, textAlign: "right" }}>
                الإيراد الشهري المُوثّق (ر.س)
              </Text>
              <TextInput
                value={verifiedRevenue}
                onChangeText={setVerifiedRevenue}
                keyboardType="number-pad"
                placeholder="48200"
                placeholderTextColor={colors.mutedText}
                style={{
                  height: 46,
                  borderWidth: 1,
                  borderColor: colors.grid,
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  fontFamily: fonts.mono,
                  fontSize: 15,
                  color: colors.ink,
                  textAlign: "left",
                }}
              />
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, textAlign: "right" }}>
                ملاحظات (تظهر لصاحب المشروع عند الرفض)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                placeholder="ملاحظات المراجعة..."
                placeholderTextColor={colors.mutedText}
                style={{
                  minHeight: 90,
                  borderWidth: 1,
                  borderColor: colors.grid,
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: colors.ink,
                  textAlign: "right",
                  textAlignVertical: "top",
                }}
              />
              {error ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}>
                  {error}
                </Text>
              ) : null}
              <Button label="إنهاء التوثيق (موثّق)" fullWidth loading={busy} onPress={onComplete} />
              <Button label="رفض التوثيق" variant="ghost" fullWidth loading={busy} onPress={onReject} />
            </Card>
          ) : (
            <Card>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "right" }}>
                الحالة: {request.status === "completed" ? "مكتمل" : request.status === "rejected" ? "مرفوض" : request.status}
              </Text>
              {request.notes ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.subtleText, textAlign: "right", marginTop: 8 }}>
                  {request.notes}
                </Text>
              ) : null}
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
