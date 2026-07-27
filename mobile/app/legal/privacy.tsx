import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts } from "@/theme";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "البيانات التي نجمعها",
    body:
      "نجمع الاسم والبريد الإلكتروني ورقم الجوال عند إنشاء الحساب، وبيانات الإعلانات التي تنشرها، ومحتوى الرسائل بينك وبين المستخدمين الآخرين على المنصة، وبيانات التوثيق المالي عند طلبها.",
  },
  {
    title: "كيف نستخدم بياناتك",
    body:
      "تُستخدم بياناتك لتشغيل المنصة: عرض إعلاناتك، تمكين التواصل بين أصحاب المشاريع والممولين، إرسال إشعارات متعلقة بحسابك، ومراجعة طلبات التوثيق المالي عبر المحاسبين المستقلين. لا نبيع بياناتك لأطراف ثالثة.",
  },
  {
    title: "مشاركة البيانات",
    body:
      "تتم مشاركة اسمك وتقييماتك مع الطرف الآخر عند بدء محادثة على إعلان. تُشارك بيانات التوثيق المالي فقط مع المحاسب المكلَّف بطلبك وفريق معيار.",
  },
  {
    title: "حقوقك",
    body:
      "يمكنك طلب تعديل أو حذف بياناتك في أي وقت من خلال التواصل مع فريق الدعم. حذف الحساب يؤدي لإخفاء إعلاناتك ومحادثاتك من العرض العام.",
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const { t } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>سياسة الخصوصية</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 20 }}>
        {SECTIONS.map((s) => (
          <View key={s.title} style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text, textAlign: "right" }}>
              {s.title}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 23, color: t.textMuted, textAlign: "right" }}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
