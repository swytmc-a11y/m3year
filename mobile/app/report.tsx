import { useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { submitReport } from "@/lib/reports";
import { fonts, radius } from "@/theme";

export default function ReportScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { targetType, targetId } = useLocalSearchParams<{
    targetType: "listing" | "franchise" | "user";
    targetId: string;
  }>();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError(undefined);
    if (reason.trim().length < 5) {
      setError("اكتب سببًا واضحًا للبلاغ (5 أحرف على الأقل).");
      return;
    }
    setLoading(true);
    const { error: submitError } = await submitReport({
      targetType:
        targetType === "user" ? "user" : targetType === "franchise" ? "franchise" : "listing",
      targetId: String(targetId),
      reason: reason.trim(),
    });
    setLoading(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setSent(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>الإبلاغ</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        {sent ? (
          <Card style={{ gap: 12, alignItems: "center", padding: 32 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: t.text }}>تم استلام بلاغك</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center" }}>
              سيراجع فريق معيار البلاغ ويتخذ الإجراء المناسب.
            </Text>
            <Button label="عودة" onPress={() => router.back()} />
          </Card>
        ) : (
          <Card style={{ padding: 20, gap: 16 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
              أخبرنا لماذا تُبلغ عن هذا{" "}
              {targetType === "user" ? "المستخدم" : targetType === "franchise" ? "الامتياز" : "الإعلان"}.
              سيتم مراجعة البلاغ من فريق معيار.
            </Text>
            <ReasonInput value={reason} onChangeText={setReason} />
            {error ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.danger, textAlign: "right" }}>{error}</Text>
            ) : null}
            <Button label="إرسال البلاغ" fullWidth loading={loading} onPress={onSubmit} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReasonInput({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  const { t } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="اشرح سبب البلاغ..."
      placeholderTextColor={t.textMuted}
      multiline
      numberOfLines={5}
      maxLength={1000}
      style={{
        minHeight: 120,
        borderRadius: radius.lg,
        backgroundColor: t.surface2,
        padding: 12,
        fontFamily: fonts.body,
        fontSize: 13,
        color: t.text,
        textAlign: "right",
        textAlignVertical: "top",
      }}
    />
  );
}
