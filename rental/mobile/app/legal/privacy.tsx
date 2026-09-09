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
      "نجمع الاسم والبريد الإلكتروني ورقم الجوال عند إنشاء الحساب، وبيانات حجوزاتك (السيارة والفرع والتواريخ والمبالغ والخدمات المختارة). عند اختيارك «الأقرب لي» نستخدم موقع جهازك في تلك اللحظة لترتيب النتائج فقط، ولا نحفظه.",
  },
  {
    title: "بيانات الدفع",
    body:
      "لا نستقبل ولا نحفظ بيانات بطاقتك. تُدخل بياناتك في صفحة مزوّد الدفع المرخّص مباشرة، ولا يصلنا منه سوى نتيجة العملية ومعرّفها لربطها بحجزك.",
  },
  {
    title: "كيف نستخدم بياناتك",
    body:
      "لتشغيل الحجز: إتاحة السيارة للمدة المحجوزة، تمكين الفرع من تجهيزها واستقبالك، إصدار الفاتورة، إرسال إشعارات حالة الحجز وتذكيرات الاستلام والتسليم، والتعامل مع الإلغاء والاسترداد. لا نبيع بياناتك لأي طرف ثالث.",
  },
  {
    title: "مشاركة البيانات",
    body:
      "يطّلع فرع الاستلام على بيانات حجزك واسمك ورقم جوالك لتجهيز السيارة واستقبالك. وتُشارك البيانات اللازمة مع مزوّد الدفع لإتمام العملية أو الاسترداد، ومع الجهات المختصة عند وجود مخالفة مرورية أو حادث أو طلب نظامي.",
  },
  {
    title: "مدة الاحتفاظ",
    body:
      "نحتفظ ببيانات الحجوزات والفواتير للمدة التي تفرضها الأنظمة المحاسبية والضريبية في المملكة حتى بعد حذف الحساب، لأن الاحتفاظ بها التزام نظامي لا خيار فيه. ما عدا ذلك يُحذف مع الحساب.",
  },
  {
    title: "حقوقك",
    body:
      "يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذف حسابك في أي وقت من داخل التطبيق أو عبر الدعم. حذف الحساب لا يلغي حجزًا قائمًا — ألغِ حجوزاتك أولًا أو تواصل مع الفرع.",
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
