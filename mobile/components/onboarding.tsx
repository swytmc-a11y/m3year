import { useRef, useState } from "react";
import { View, Text, ScrollView, useWindowDimensions, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button, Tappable } from "@/components/kit";
import { LogoMark } from "@/components/logo";
import { OpportunityIcon, StorefrontIcon, ShieldIcon, ChatIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";

/**
 * First-run introduction.
 *
 * The one thing a new user cannot guess from the UI is what Miyar actually
 * does at the end: it is an ads-and-verification platform, and the deal
 * itself happens off-platform between the two parties. That was previously
 * stated only in one line at the bottom of a listing page, which is far too
 * late — someone could reasonably assume the app holds the money. The last
 * slide says it plainly, before anyone signs up.
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
    icon: (c) => <OpportunityIcon color={c} size={30} />,
    title: "فرص استثمارية حقيقية",
    body: "تصفّح مشاريع قائمة تعرض حصة للبيع، بأرقامها ومدينتها وقطاعها — كل ما تحتاجه للمقارنة قبل أن تتواصل.",
  },
  {
    key: "franchises",
    icon: (c) => <StorefrontIcon color={c} size={30} />,
    title: "وامتيازات تجارية للتوسّع",
    body: "علامات تجارية تطرح امتيازها: رسوم الامتياز، الاستثمار المبدئي، الدعم والتدريب، ومدة العقد.",
  },
  {
    key: "trust",
    icon: (c) => <ShieldIcon color={c} size={30} />,
    title: "توثيق مالي ومؤشر معيار",
    body: "الإعلان الموثّق راجع أرقامه محاسب معتمد. ومؤشر معيار يلخّص جودة البيانات ومدى اكتمالها في تقدير واحد.",
  },
  {
    key: "deal",
    icon: (c) => <ChatIcon focused={false} color={c} size={30} />,
    title: "التفاوض بينك وبين الطرف الآخر",
    body: "تتواصلان مباشرة داخل التطبيق. معيار منصة إعلانات وتوثيق فقط — الصفقة نفسها تتم بينكما خارج المنصة، ولا نحتفظ بأي مبالغ.",
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
          <LogoMark size={34} />
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
