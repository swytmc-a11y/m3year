import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Chip, IconButton, Tappable } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";

type FaqItem = { q: string; a: string };
type FaqGroup = { title: string; items: FaqItem[] };

const BOOKING: FaqGroup = {
  title: "الحجز والأسعار",
  items: [
    {
      q: "كيف يُحتسب سعر الإيجار؟",
      a: "حسب مدة الإيجار: للأيام سعر يومي، وللأسبوع فأكثر سعر يومي أقل، وللشهر فأكثر سعر أقل منهما. يُطبَّق السعر المناسب على كامل المدة — لا يُقسَّم الحجز على أكثر من شريحة. تظهر لك الشرائح الثلاث داخل صفحة السيارة قبل الحجز.",
    },
    {
      q: "هل الأسعار شاملة الضريبة؟",
      a: "نعم. كل سعر يظهر في التطبيق شامل ضريبة القيمة المضافة، ويظهر لك تفصيل الضريبة في ملخّص الحجز قبل الدفع.",
    },
    {
      q: "ما مبلغ التأمين وهل يُخصم مني الآن؟",
      a: "لا يُخصم أي مبلغ تأمين عبر التطبيق. بعض الفروع تطلب مبلغ تأمين يُسوّى عند الاستلام في الفرع نفسه ويُعاد لك عند تسليم السيارة. إن كان الفرع يطلبه فستجد إشعارًا بذلك في صفحة السيارة.",
    },
    {
      q: "متى يتأكد حجزي؟",
      a: "بعض السيارات مضبوطة على التأكيد الفوري فيتأكد حجزها مباشرة بعد الدفع، وبعضها يحتاج تأكيد الفرع فيصلك إشعار عند التأكيد. يظهر نوع التأكيد في صفحة السيارة قبل الحجز.",
    },
    {
      q: "هل أستطيع تمديد الإيجار بعد الاستلام؟",
      a: "التمديد يتم مع الفرع مباشرة — تواصل معه من صفحة حجزك قبل انتهاء المدة، لأن السيارة قد تكون محجوزة لعميل آخر بعدك.",
    },
  ],
};

const CANCEL: FaqGroup = {
  title: "الإلغاء والاسترداد",
  items: [
    {
      q: "كيف ألغي حجزي؟",
      a: "من «حجوزاتي» افتح الحجز واضغط إلغاء. تظهر لك سياسة الإلغاء المطبّقة على حجزك قبل التأكيد النهائي.",
    },
    {
      q: "هل أسترد المبلغ عند الإلغاء؟",
      a: "نعم، الإلغاء بعد الدفع يُرفع له طلب استرداد للمبلغ إلى نفس وسيلة الدفع. تختلف النسبة المستردّة حسب قرب موعد الاستلام — الإلغاء المبكّر يسترد كامل المبلغ.",
    },
    {
      q: "كم يستغرق وصول المبلغ المسترد؟",
      a: "بعد اعتماد الاسترداد من طرفنا، يعتمد وصول المبلغ على البنك أو مصدر البطاقة، وغالبًا خلال أيام عمل قليلة.",
    },
    {
      q: "ماذا لو لم يتم تأكيد حجزي من الفرع؟",
      a: "لا يُخصم منك شيء مقابل حجز غير مؤكّد — وإذا كان قد تم الدفع فيُعاد المبلغ كاملًا.",
    },
  ],
};

const PICKUP: FaqGroup = {
  title: "الاستلام والقيادة",
  items: [
    {
      q: "ما الذي أحتاجه عند الاستلام؟",
      a: "رخصة قيادة سارية والهوية أو الإقامة، وبطاقة باسمك إن طلب الفرع مبلغ تأمين. تأكد أن الاسم في الحجز هو نفسه اسم السائق.",
    },
    {
      q: "هل هناك حد للكيلومترات؟",
      a: "بعض السيارات لها حد يومي للكيلومترات مع رسم لكل كيلومتر إضافي، ويظهر ذلك في صفحة السيارة. وتقدر تضيف خدمة «كيلومتر مفتوح» عند الحجز إن كانت متاحة للسيارة.",
    },
    {
      q: "ما الخدمات الإضافية المتاحة؟",
      a: "حسب السيارة: تأمين شامل، سائق إضافي، كيلومتر مفتوح، ووقود مدفوع مسبقًا. تختارها عند الحجز فتُضاف لإجمالي المبلغ.",
    },
    {
      q: "هل يمكن لشخص آخر قيادة السيارة؟",
      a: "فقط إذا أُضيف كسائق إضافي ضمن الحجز وقُدّمت رخصته للفرع عند الاستلام. قيادة شخص غير مسجّل قد تُسقط التغطية التأمينية.",
    },
    {
      q: "ماذا أفعل عند حادث أو عطل؟",
      a: "تواصل مع الفرع فورًا من صفحة حجزك، ولا تُجرِ أي إصلاح أو تسوية دون الرجوع له. في الحوادث يلزم بلاغ رسمي (نجم أو الجهة المختصة).",
    },
  ],
};

const TIPS = [
  "إذا كانت مدتك قريبة من أسبوع أو شهر، جرّب تمديدها يومًا أو يومين — قد ينزل سعر اليوم كثيرًا وتخرج التكلفة أقل.",
  "راجع حد الكيلومترات قبل الحجز إذا كانت رحلتك بين مدن — «كيلومتر مفتوح» أرخص من الرسم الإضافي غالبًا.",
  "صوّر السيارة من كل الجهات عند الاستلام وعند التسليم — يوفّر عليك أي خلاف لاحق حول الأضرار.",
  "ألغِ مبكرًا إن تغيّرت خطتك: نسبة الاسترداد تقل كلما اقترب موعد الاستلام.",
];

export default function FaqScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const groups = [BOOKING, CANCEL, PICKUP];
  const [activeGroup, setActiveGroup] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ width: "100%", maxWidth: 820, alignSelf: "center", flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>الأسئلة الشائعة</Text>
      </View>

      <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 820, alignSelf: "center", padding: 18, gap: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>
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

        <Card style={{ padding: 0, overflow: "hidden" }}>
          {groups[activeGroup].items.map((item, idx) => {
            const open = openIndex === idx;
            return (
              <Tappable key={item.q} haptic="none" onPress={() => setOpenIndex(open ? null : idx)}>
                <View style={{ padding: 18, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: t.border, gap: open ? 10 : 0 }}>
                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", gap: 12 }}>
                    <Text style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 13.5, color: t.text, textAlign: "right" }}>
                      {item.q}
                    </Text>
                    <Text style={{ fontSize: 14, color: t.primary }}>{open ? "−" : "+"}</Text>
                  </View>
                  {open ? (
                    <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
                      {item.a}
                    </Text>
                  ) : null}
                </View>
              </Tappable>
            );
          })}
        </Card>

        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>نصائح سريعة</Text>
          <Card style={{ padding: 18, gap: 12 }}>
            {TIPS.map((tip) => (
              <View key={tip} style={{ flexDirection: "row-reverse", gap: 8 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: t.success }}>●</Text>
                <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: t.text, textAlign: "right", lineHeight: 21 }}>
                  {tip}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
