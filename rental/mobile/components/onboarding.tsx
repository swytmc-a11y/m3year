import { useRef, useState } from "react";
import { View, Text, ScrollView, useWindowDimensions, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button, Tappable } from "@/components/kit";
import { LogoMarkColor } from "@/components/logo";
import { SearchIcon, CalculatorIcon, ShieldIcon, StorefrontIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";

/**
 * First-run introduction.
 *
 * The things a customer cannot guess from the UI are the ones that decide
 * whether they trust the price: that the rate drops as the rental gets
 * longer, that what they see already includes VAT, and that a deposit may
 * still be arranged at the branch counter even though nothing extra is
 * charged here. Saying those before signup is the point — finding them at
 * checkout is what makes a rental feel like a bait price.
 *
 * Rendered as an overlay by the root layout rather than as a route, matching
 * how AppSplash works: it must appear regardless of auth state and without
 * competing with the router's own redirects.
 */

type Slide = {
  key: string;
  icon: (color: string) => React.ReactNode;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    key: "browse",
    icon: (c) => <SearchIcon color={c} size={30} />,
    title: "اختر سيارتك في دقيقة",
    body: "تصفّح السيارات المتاحة فعلًا بسعر اليوم وموقع الفرع. رتّبها بالأرخص أو بالأقرب لك، أو بالاثنين معًا.",
  },
  {
    key: "pricing",
    icon: (c) => <CalculatorIcon color={c} size={30} />,
    title: "كلما طالت المدة قلّ سعر اليوم",
    body: "للأيام سعر، وللأسبوع سعر أقل، وللشهر أقل. تختار مدتك فيُحتسب السعر المناسب لها تلقائيًا قبل أن تدفع.",
  },
  {
    key: "vat",
    icon: (c) => <ShieldIcon color={c} size={30} />,
    title: "السعر الظاهر شامل الضريبة",
    body: "ما تراه في صفحة السيارة هو ما تدفعه — بلا رسوم تظهر عند الاستلام. أي مبلغ تأمين يُوضّح لك مسبقًا ويُسوّى في الفرع.",
  },
  {
    key: "branch",
    icon: (c) => <StorefrontIcon color={c} size={30} />,
    title: "تستلم من الفرع مباشرة",
    body: "بعد تأكيد الحجز تجد بيانات الفرع ورقمه في حجزك، وتقدر تتواصل معه مباشرة قبل موعد الاستلام.",
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  function goTo(next: number) {
    // RTL: the scroll offset still grows left-to-right in layout terms, so
    // paging by width works unchanged — React Native mirrors the axis itself.
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }

  return (
    <Animated.View entering={FadeIn.duration(220)} style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
          <LogoMarkColor size={34} />
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide) => (
            <View
              key={slide.key}
              style={{ width, paddingHorizontal: 32, justifyContent: "center", gap: 20 }}
            >
              <View
                style={{
                  alignSelf: "center",
                  width: 76,
                  height: 76,
                  borderRadius: radius.xl,
                  backgroundColor: t.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  ...t.shadowSm,
                }}
              >
                {slide.icon(t.primary as string)}
              </View>

              <Text
                style={{
                  fontFamily: fonts.displayBold,
                  fontSize: 20,
                  color: t.text,
                  textAlign: "center",
                  lineHeight: 30,
                }}
              >
                {slide.title}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13.5,
                  color: t.textMuted,
                  textAlign: "center",
                  lineHeight: 24,
                }}
              >
                {slide.body}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 28, paddingBottom: 8, gap: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 7 }}>
            {SLIDES.map((s, i) => (
              <View
                key={s.key}
                style={{
                  width: i === index ? 20 : 7,
                  height: 7,
                  borderRadius: radius.pill,
                  backgroundColor: i === index ? t.primary : t.border,
                }}
              />
            ))}
          </View>

          <Button
            label={isLast ? "ابدأ الآن" : "التالي"}
            fullWidth
            onPress={() => (isLast ? onDone() : goTo(index + 1))}
          />

          {/* Skipping is always available: forcing four taps on someone who
              already knows the product is friction with no upside. */}
          <Tappable onPress={onDone} haptic="light" accessibilityLabel="تخطي المقدمة">
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12.5,
                color: t.textMuted,
                textAlign: "center",
                paddingVertical: 6,
                opacity: isLast ? 0 : 1,
              }}
            >
              تخطي
            </Text>
          </Tappable>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
