import { View, Text, ScrollView, Linking } from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { TopBar, Card, Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { colors, fonts } from "@/theme";

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title="حول التطبيق" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Card style={{ alignItems: "center", gap: 12, paddingVertical: 32 }}>
          <Logo size={26} />
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.mutedText,
              textAlign: "center",
              lineHeight: 22,
              maxWidth: 280,
            }}
          >
            منصة إعلانات وتوثيق للمشاريع التجارية والامتيازات في السعودية —
            نربط أصحاب المشاريع بالمستثمرين، ونوثّق الأرقام عبر محاسبين
            مرخّصين.
          </Text>
          <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.subtleText }}>
            الإصدار {version}
          </Text>
        </Card>

        <Card style={{ gap: 14 }}>
          <Text
            style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: "right" }}
          >
            إخلاء مسؤولية
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: colors.mutedText,
              textAlign: "right",
              lineHeight: 22,
            }}
          >
            معيار منصة إعلانات وتوثيق فقط، وليست طرفًا في أي صفقة. توثيق
            الأرقام لا يشكّل ضمانًا أو نصيحة استثمارية — تحقّق دائمًا بنفسك
            وراجع محاميًا قبل توقيع أي عقد.
          </Text>
        </Card>

        <View
          style={{
            backgroundColor: colors.white,
            borderColor: colors.grid,
            borderWidth: 1,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <Link href="/faq" asChild>
            <Button label="الأسئلة الشائعة" variant="ghost" fullWidth />
          </Link>
        </View>

        <View style={{ gap: 12 }}>
          <Link href="/legal/terms">
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, textAlign: "right" }}>
              الشروط والأحكام
            </Text>
          </Link>
          <Link href="/legal/privacy">
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, textAlign: "right" }}>
              سياسة الخصوصية
            </Text>
          </Link>
          <Text
            onPress={() => Linking.openURL("mailto:support@miyar.app")}
            style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, textAlign: "right" }}
          >
            تواصل معنا: support@miyar.app
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
