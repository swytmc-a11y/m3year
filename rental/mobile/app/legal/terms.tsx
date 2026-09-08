import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts } from "@/theme";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "طبيعة المنصة",
    body:
      "معيار منصة إعلانات وتوثيق مالي مستقل فقط. تتيح لأصحاب المشاريع نشر إعلانات عن مشاريعهم، وللممولين المحتملين التصفح والتواصل. معيار لا تنفّذ أي صفقة شراكة أو بيع حصة، ولا تُعد طرفًا في أي عقد، ولا تحتفظ بأي أموال كوسيط (لا يوجد ضمان/Escrow). أي اتفاق شراكة يتم التفاوض عليه وإتمامه بالكامل خارج المنصة وبين الطرفين مباشرة، وتحت مسؤوليتهما القانونية الكاملة.",
  },
  {
    title: "التوثيق المالي",
    body:
      "خدمة التوثيق المالي تُقدَّم عبر محاسبين مستقلين مسجَّلين على المنصة. توثيق الإعلان يعني مراجعة محاسب مستقل للأرقام المُصرَّح بها من صاحب المشروع، ولا يمثّل ضمانًا أو تزكية من معيار لصحة المشروع أو جدواه الاستثمارية.",
  },
  {
    title: "مسؤولية المستخدم",
    body:
      "يلتزم المستخدم بتقديم معلومات صحيحة عند التسجيل ونشر الإعلانات، وعدم استخدام المنصة لأي غرض احتيالي أو مخالف للأنظمة. يحتفظ فريق معيار بحق مراجعة الإعلانات ورفضها أو إزالتها إذا خالفت هذه الشروط.",
  },
  {
    title: "إخلاء المسؤولية",
    body:
      "لا تتحمل معيار أي مسؤولية عن نتائج أي شراكة أو صفقة تتم بين المستخدمين خارج المنصة. القرار الاستثماري وقرار الشراكة يقع بالكامل على عاتق أطراف الصفقة.",
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const { t } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>الشروط والأحكام</Text>
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
