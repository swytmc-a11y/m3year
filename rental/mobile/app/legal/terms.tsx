import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts } from "@/theme";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "طبيعة الخدمة",
    body:
      "نقدّم خدمة تأجير سيارات من فروعنا مباشرة. السيارات المعروضة في التطبيق مملوكة أو مشغّلة من قِبلنا، ولا يستطيع أي طرف آخر عرض سياراته هنا. الحجز عبر التطبيق هو تعاقد مباشر بيننا وبينك على استئجار السيارة للمدة المحددة، ويكتمل بتسليم السيارة لك في الفرع.",
  },
  {
    title: "الأسعار والدفع",
    body:
      "جميع الأسعار المعروضة بالريال السعودي وشاملة ضريبة القيمة المضافة. يُحتسب السعر حسب مدة الإيجار: شريحة يومية أو أسبوعية أو شهرية، وتُطبَّق الشريحة المناسبة على كامل المدة. يُدفع مبلغ الحجز عبر التطبيق وقت الحجز، وتظهر لك الخدمات الإضافية المختارة وقيمتها ضمن الإجمالي قبل الدفع.",
  },
  {
    title: "مبلغ التأمين",
    body:
      "لا نستوفي أي مبلغ تأمين عبر التطبيق. قد يطلب الفرع مبلغ تأمين مسترجعًا عند استلام السيارة يُسوّى في الفرع مباشرة ويُعاد عند تسليم السيارة سليمة، ويُوضَّح ذلك مسبقًا في صفحة السيارة.",
  },
  {
    title: "الإلغاء والاسترداد",
    body:
      "يمكنك إلغاء الحجز من التطبيق قبل موعد الاستلام. عند الإلغاء بعد الدفع يُرفع طلب استرداد إلى وسيلة الدفع نفسها، وتُحتسب النسبة المستردّة حسب قرب موعد الاستلام وفق السياسة المعروضة لك عند الإلغاء. إذا لم يتم تأكيد الحجز من الفرع، يُعاد المبلغ كاملًا.",
  },
  {
    title: "شروط الاستلام والقيادة",
    body:
      "يلزم لاستلام السيارة رخصة قيادة سارية وهوية أو إقامة سارية باسم المستأجر نفسه. لا يجوز قيادة السيارة لغير المستأجر أو السائق الإضافي المسجّل في الحجز، ولا استخدامها لأغراض مخالفة للأنظمة أو خارج المملكة دون إذن مسبق. المخالفات المرورية ورسومها خلال مدة الإيجار على المستأجر.",
  },
  {
    title: "الأضرار والحوادث",
    body:
      "المستأجر مسؤول عن سلامة السيارة طوال مدة الإيجار. في حال وقوع حادث يلزم إبلاغ الجهة المختصة والفرع فورًا والحصول على تقرير رسمي، وعدم إجراء أي إصلاح أو تسوية دون الرجوع إلينا. تحدّد التغطية التأمينية المتاحة نطاق ما يتحمّله المستأجر.",
  },
  {
    title: "حق التعديل",
    body:
      "قد نحدّث هذه الشروط أو الأسعار أو الخدمات المتاحة. الشروط السارية على أي حجز هي المعروضة وقت إتمامه، ولا تتأثر الحجوزات القائمة بأي تعديل لاحق.",
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
