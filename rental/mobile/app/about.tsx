import { View, Text, ScrollView, Linking } from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Button, Card, IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { useTheme } from "@/contexts/theme";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { fonts } from "@/theme";

export default function AboutScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ width: "100%", maxWidth: 820, alignSelf: "center", flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>حول التطبيق</Text>
      </View>

      <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 820, alignSelf: "center", padding: 18, gap: 16 }}>
        <Card style={{ alignItems: "center", gap: 12, paddingVertical: 32 }}>
          <Logo size={24} />
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 21, maxWidth: 280 }}>
            تأجير سيارات في السعودية بسعر واضح من أول لحظة — تختار سيارتك ومدتك من أقرب فرع لك، وكلما طالت المدة انخفض سعر اليوم.
          </Text>
          <Text style={{ fontFamily: fonts.numeric, fontSize: 11.5, color: t.textMuted }}>الإصدار {version}</Text>
        </Card>

        <Card style={{ padding: 20, gap: 14 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>ما تحتاج معرفته</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
            الأسعار المعروضة شاملة ضريبة القيمة المضافة. لا نستوفي مبلغ التأمين عبر التطبيق — إن طلبه الفرع فيُسوّى عند الاستلام ويُعاد عند التسليم. يلزم لاستلام السيارة رخصة قيادة سارية وهوية باسم المستأجر نفسه.
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
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}
          >
            تواصل معنا: {SUPPORT_EMAIL}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
