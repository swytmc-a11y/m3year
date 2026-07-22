import { useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, Button, Card } from "@/components/ui";
import { submitReport } from "@/lib/reports";
import { colors, fonts } from "@/theme";

export default function ReportScreen() {
  const router = useRouter();
  const { targetType, targetId } = useLocalSearchParams<{
    targetType: "listing" | "user";
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
      targetType: targetType === "user" ? "user" : "listing",
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title="الإبلاغ" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {sent ? (
          <Card style={{ gap: 12, alignItems: "center", padding: 32 }}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.ink }}>
              تم استلام بلاغك
            </Text>
            <Text
              style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "center" }}
            >
              سيراجع فريق معيار البلاغ ويتخذ الإجراء المناسب.
            </Text>
            <Button label="عودة" onPress={() => router.back()} />
          </Card>
        ) : (
          <Card style={{ gap: 16 }}>
            <Text
              style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "right", lineHeight: 22 }}
            >
              أخبرنا لماذا تُبلغ عن هذا {targetType === "user" ? "المستخدم" : "الإعلان"}. سيتم
              مراجعة البلاغ من فريق معيار.
            </Text>
            <ReasonInput value={reason} onChangeText={setReason} />
            {error ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}>
                {error}
              </Text>
            ) : null}
            <Button label="إرسال البلاغ" fullWidth loading={loading} onPress={onSubmit} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReasonInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="اشرح سبب البلاغ..."
      placeholderTextColor={colors.mutedText}
      multiline
      numberOfLines={5}
      maxLength={1000}
      style={{
        minHeight: 120,
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
  );
}
