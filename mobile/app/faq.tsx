import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, Card, Chip } from "@/components/ui";
import { colors, fonts, radius } from "@/theme";

type FaqItem = { q: string; a: string };
type FaqGroup = { title: string; items: FaqItem[] };

const GENERAL: FaqGroup = {
  title: "عن الامتياز التجاري بشكل عام",
  items: [
    {
      q: "ما هو الامتياز التجاري؟",
      a: "اتفاقية يمنح فيها صاحب علامة تجارية (المانح) لطرف آخر (الممنوح) حق تشغيل نسخة من نشاطه التجاري باسمه ونظامه، مقابل رسوم امتياز ونسبة إتاوة مستمرة من الإيراد. الممنوح يملك فرعه ويموّله بنفسه، لكنه لا يملك العلامة نفسها.",
    },
    {
      q: "ما الفرق بين الامتياز وبين شراء حصة في مشروع؟",
      a: "الامتياز ترخيص لاستخدام علامة ونظام تشغيل، لا شراكة ملكية. أما شراء حصة (زي إعلانات المشاريع في معيار) فهو تملّك جزء فعلي من منشأة قائمة. معيار منصة إعلانات وتوثيق فقط في الحالتين — الصفقة النهائية تتم خارج المنصة.",
    },
    {
      q: "ما الفرق بين امتياز الفرع الواحد وامتياز تنمية المنطقة؟",
      a: "امتياز الفرع الواحد يمنحك حق تشغيل فرع واحد في موقع محدد. امتياز تنمية المنطقة يمنحك حق فتح عدد من الفروع ضمن منطقة جغرافية معينة خلال مدة متفق عليها، وعادة يتطلب رأس مال أكبر والتزامًا زمنيًا لعدد الفروع.",
    },
    {
      q: "ما رسوم الامتياز، وما الفرق بينها وبين الإتاوة؟",
      a: "رسوم الامتياز مبلغ يُدفع مرة واحدة عند التوقيع مقابل حق استخدام العلامة والتدريب واعتماد الموقع. الإتاوة نسبة تُدفع بشكل مستمر (شهريًا غالبًا) من إجمالي الإيراد طوال مدة العقد — تُدفع حتى لو لم يحقق الفرع ربحًا.",
    },
    {
      q: "هل نظام الامتياز التجاري في السعودية له قانون ينظّمه؟",
      a: "نعم، نظام الامتياز التجاري الصادر بمرسوم ملكي (م/٢٢) ولائحته التنفيذية. من أبرز أحكامه: إلزام المانح بتسليم وثيقة إفصاح قبل ١٤ يومًا على الأقل من التوقيع، وتسجيل العقد لدى وزارة التجارة خلال ٩٠ يومًا من إبرامه.",
    },
  ],
};

const FOR_INVESTORS: FaqGroup = {
  title: "لمن يبحث عن مشروع أو امتياز",
  items: [
    {
      q: "كيف أتأكد أن الأرقام المعروضة صحيحة؟",
      a: "ابحث عن شارة «موثّق» — تعني أن محاسبًا مرخّصًا راجع البيانات المالية فعليًا وأكّدها. الإعلانات غير الموثّقة تعرض أرقامًا كما صرّح بها صاحبها فقط، بدون تدقيق مستقل.",
    },
    {
      q: "كيف أتواصل مع صاحب المشروع أو الامتياز؟",
      a: "من صفحة تفاصيل المشروع اضغط «تواصل»، أو من صفحة الامتياز اضغط «طلب فرصة» وعبّئ رأس المال المتاح والمدينة المفضّلة — تُرسل هذي المعلومات مباشرة كرسالة أولى تفتح لك محادثة مع صاحب العرض.",
    },
    {
      q: "هل معيار طرف في الصفقة أو يضمنها؟",
      a: "لا. معيار منصة إعلانات وتوثيق فقط. أي اتفاق مالي أو تعاقدي (شراء حصة، توقيع عقد امتياز) يتم بالكامل خارج المنصة وبمسؤولية الطرفين مباشرة.",
    },
    {
      q: "لماذا بعض المشاريع أو الامتيازات غير موثّقة؟",
      a: "التوثيق طلب يقدّمه صاحب العرض بنفسه ويُسند لمحاسب مرخّص لمراجعته — قد يستغرق وقتًا، أو لم يُطلب أصلًا. غياب التوثيق لا يعني بالضرورة عدم الجدية، لكنه يعني عدم وجود تدقيق مستقل حتى الآن.",
    },
  ],
};

const FOR_OWNERS: FaqGroup = {
  title: "لأصحاب المشاريع والامتيازات",
  items: [
    {
      q: "كيف أنشر مشروعي أو امتيازي؟",
      a: "من الرئيسية اضغط «إعلان جديد» أو «امتياز جديد»، عبّئ البيانات والصور، ثم اختر «إرسال للمراجعة». فريق معيار يراجع الإعلان قبل نشره للعامة — لا يُنشر تلقائيًا.",
    },
    {
      q: "كم يستغرق قبول الإعلان؟",
      a: "تختلف المدة حسب حجم المراجعة، لكن حالة إعلانك (بانتظار المراجعة / منشور / مرفوض) تظهر لك دائمًا من «إعلاناتي» أو «امتيازاتي»، ومع أي رفض يظهر السبب صراحة.",
    },
    {
      q: "كيف أطلب توثيق الأرقام؟",
      a: "من صفحة إدارة الإعلان أو الامتياز اطلب «التوثيق المالي»، ثم ارفع قوائمك المالية — يُسنَد الطلب لمحاسب مرخّص يراجعها ويؤكد الأرقام. بعد الاعتماد تظهر شارة «موثّق» على إعلانك.",
    },
    {
      q: "هل تعديل إعلان منشور يخفيه من الزوار؟",
      a: "أي تعديل جوهري على إعلان منشور (العنوان، الرسوم، الوصف...) يعيده تلقائيًا لقائمة المراجعة قبل ظهوره من جديد للعامة — حماية لجودة المعلومة المعروضة.",
    },
  ],
};

const TIPS = [
  "قارن بين عروض متشابهة من نفس القطاع قبل اتخاذ قرار — لا تحكم على عرض واحد بمعزل عن السوق.",
  "التوثيق يقلّل المخاطرة لكنه لا يلغيها — راجع أي عقد نهائي مع محامٍ قبل التوقيع.",
  "لأصحاب العروض: كل ما زادت دقّة البيانات ووضوح الصور، زادت جدّية المتواصلين معك.",
  "رسوم الامتياز جزء صغير فقط من التكلفة الحقيقية — احسب أيضًا التجهيز والتشغيل الأولي قبل المقارنة بين الفرص.",
];

export default function FaqScreen() {
  const router = useRouter();
  const groups = [GENERAL, FOR_INVESTORS, FOR_OWNERS];
  const [activeGroup, setActiveGroup] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title="الأسئلة الشائعة" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}
        >
          {groups.map((g, idx) => (
            <Chip
              key={g.title}
              label={g.title}
              active={activeGroup === idx}
              onPress={() => {
                setActiveGroup(idx);
                setOpenIndex(null);
              }}
            />
          ))}
        </ScrollView>

        <Card style={{ gap: 4, padding: 0, overflow: "hidden" }}>
          {groups[activeGroup].items.map((item, idx) => {
            const open = openIndex === idx;
            return (
              <Pressable
                key={item.q}
                onPress={() => setOpenIndex(open ? null : idx)}
                style={{
                  padding: 18,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: colors.grid,
                  gap: open ? 10 : 0,
                }}
              >
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", gap: 12 }}>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: fonts.bodyBold,
                      fontSize: 14,
                      color: colors.ink,
                      textAlign: "right",
                    }}
                  >
                    {item.q}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.mutedText }}>{open ? "−" : "+"}</Text>
                </View>
                {open ? (
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: colors.mutedText,
                      textAlign: "right",
                      lineHeight: 22,
                    }}
                  >
                    {item.a}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </Card>

        <View style={{ gap: 10 }}>
          <Text
            style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: "right" }}
          >
            نصائح سريعة
          </Text>
          <View
            style={{
              backgroundColor: colors.white,
              borderColor: colors.grid,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: 18,
              gap: 12,
            }}
          >
            {TIPS.map((tip) => (
              <View key={tip} style={{ flexDirection: "row-reverse", gap: 8 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.verify }}>
                  ●
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: colors.ink,
                    textAlign: "right",
                    lineHeight: 21,
                  }}
                >
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
