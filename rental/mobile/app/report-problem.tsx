import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, IconButton, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { reportUserFeedback } from "@/lib/error-reporting";
import { fonts } from "@/theme";

export default function ReportProblemScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const { session, loading: authLoading } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  async function onSubmit() {
    setError(undefined);
    if (message.trim().length < 5) {
      setError("اكتب وصفًا أوضح للمشكلة.");
      return;
    }
    setLoading(true);
    const { error: submitError } = await reportUserFeedback(message);
    setLoading(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setMessage("");
    toast("تم إرسال البلاغ، شكرًا لك.", "success");
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ width: "100%", maxWidth: 820, alignSelf: "center", flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
          <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
            <ChevronBackIcon color={t.text} />
          </IconButton>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>الإبلاغ عن مشكلة</Text>
        </View>

        <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 820, alignSelf: "center", padding: 18, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Card style={{ padding: 20, gap: 12 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", lineHeight: 20 }}>
              واجهت خطأ أو شيء لا يعمل كما هو متوقع؟ صف المشكلة بالتفصيل وسيصل بلاغك مباشرة لفريق الدعم.
            </Text>
          </Card>

          <Card style={{ padding: 20, gap: 14 }}>
            <Field
              label="وصف المشكلة"
              value={message}
              onChangeText={setMessage}
              placeholder="مثال: عند فتح صفحة السيارة تظهر شاشة فارغة..."
              multiline
              maxLength={500}
            />
            {error ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right" }}>{error}</Text>
            ) : null}
            <Button label="إرسال البلاغ" fullWidth loading={loading} onPress={onSubmit} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
