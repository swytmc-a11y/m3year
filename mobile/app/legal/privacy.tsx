import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/ui";
import { colors, fonts } from "@/theme";

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
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title="سياسة الخصوصية" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {SECTIONS.map((s) => (
          <View key={s.title} style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, textAlign: "right" }}>
              {s.title}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 24, color: colors.subtleText, textAlign: "right" }}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
