import { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { TopBar, Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth";
import {
  getLatestFranchiseVerificationRequest,
  setFinancialStatementPath,
} from "@/lib/verification-actions";
import { uploadFinancialStatement, getVerificationDocSignedUrl } from "@/lib/storage";
import type { VerificationRequestRow } from "@/lib/accountant-actions";
import { colors, fonts } from "@/theme";
import * as Linking from "expo-linking";

const REQUEST_STATUS_LABELS: Record<VerificationRequestRow["status"], string> = {
  requested: "بانتظار استلام محاسب",
  assigned: "تم إسناده لمحاسب",
  in_review: "قيد المراجعة",
  completed: "مكتمل",
  rejected: "مرفوض",
};

export default function FranchiseOwnerVerificationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();

  const [request, setRequest] = useState<VerificationRequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [openingDoc, setOpeningDoc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await getLatestFranchiseVerificationRequest(String(id));
    setRequest(data ?? null);
    setError(err);
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

  async function onPickAndUpload() {
    if (!request) return;
    setError(undefined);
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setBusy(true);
    const { path, error: uploadError } = await uploadFinancialStatement(
      request.id,
      asset.uri,
      asset.name,
    );
    if (uploadError || !path) {
      setBusy(false);
      setError(uploadError ?? "تعذّر رفع الملف الآن.");
      return;
    }
    const { error: saveError } = await setFinancialStatementPath(request.id, path);
    setBusy(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    load();
  }

  async function onOpenDoc(path: string) {
    setOpeningDoc(true);
    const url = await getVerificationDocSignedUrl(path);
    setOpeningDoc(false);
    if (!url) {
      setError("تعذّر فتح الملف الآن.");
      return;
    }
    Linking.openURL(url);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title="التوثيق المالي" onBack={() => router.back()} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : !request ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.mutedText, textAlign: "center" }}>
            لا يوجد طلب توثيق لهذا الامتياز بعد.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Card style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, textAlign: "right" }}>
              حالة الطلب
            </Text>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink, textAlign: "right" }}>
              {REQUEST_STATUS_LABELS[request.status]}
            </Text>
          </Card>

          <Card style={{ gap: 14 }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, textAlign: "right" }}>
              القوائم المالية
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, textAlign: "right", lineHeight: 22 }}>
              يظهر هذا الملف فقط لك وللمحاسب المكلَّف بمراجعة طلبك، ولا يُنشر
              للعامة أبدًا.
            </Text>
            {request.financial_statement_path ? (
              <Button
                label="فتح الملف المرفوع"
                variant="ghost"
                fullWidth
                loading={openingDoc}
                onPress={() => onOpenDoc(request.financial_statement_path!)}
              />
            ) : null}
            <Button
              label={request.financial_statement_path ? "رفع ملف بديل" : "رفع القوائم المالية"}
              fullWidth
              loading={busy}
              onPress={onPickAndUpload}
            />
            {error ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}>
                {error}
              </Text>
            ) : null}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
