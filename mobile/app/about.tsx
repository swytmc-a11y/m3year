import { View, Text, ScrollView, Linking } from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Button, Card, IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { useTheme } from "@/contexts/theme";
import { fonts } from "@/theme";

export default function AboutScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>حول التطبيق</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <Card style={{ alignItems: "center", gap: 12, paddingVertical: 32 }}>
          <Logo size={24} />
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 21, maxWidth: 280 }}>
            منصة إعلانات وتوثيق للمشاريع التجارية والامتيازات في السعودية — نربط أصحاب المشاريع بالمستثمرين، ونوثّق الأرقام عبر محاسبين مرخّصين.
          </Text>
          <Text style={{ fontFamily: fonts.numeric, fontSize: 11.5, color: t.textMuted }}>الإصدار {version}</Text>
        </Card>

        <Card style={{ padding: 20, gap: 14 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>إخلاء مسؤولية</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
            معيار منصة إعلانات وتوثيق فقط، وليست طرفًا في أي صفقة. توثيق الأرقام لا يشكّل ضمانًا أو نصيحة استثمارية — تحقّق دائمًا بنفسك وراجع محاميًا قبل توقيع أي عقد.
          </Text>
        </Card>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <Link href="/faq" asChild>
            <Button label="الأسئلة الشائعة" variant="secondary" fullWidth />
          </Link>
        </Card>

        <View style={{ gap: 12 }}>
          <Link href="/legal/terms">
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>الشروط والأحكام</Text>
          </Link>
          <Link href="/legal/privacy">
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>سياسة الخصوصية</Text>
          </Link>
          <Text
            onPress={() => Linking.openURL("mailto:support@miyar.app")}
            style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}
          >
            تواصل معنا: support@miyar.app
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
