import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LogoMark } from "@/components/logo";
import { useTheme } from "@/contexts/theme";
import { fonts } from "@/theme";

/**
 * Branded loading overlay shown briefly on cold start, on top of the app once
 * fonts are ready. Fades itself out and calls onDone when finished so the host
 * can unmount it. Purely presentational — never blocks navigation.
 *
 * Runs on the UI thread (Reanimated worklets) so the intro stays smooth even
 * while the JS thread is busy restoring the session and warming first queries.
 */
export function AppSplash({ onDone }: { onDone: () => void }) {
  const { t } = useTheme();
  const opacity = useSharedValue(0);
  const markScale = useSharedValue(0.9);
  const contentShift = useSharedValue(8);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    markScale.value = withSpring(1, { damping: 12, stiffness: 120, mass: 0.7 });
    contentShift.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });

    opacity.value = withDelay(
      1150,
      withTiming(0, { duration: 340, easing: Easing.in(Easing.cubic) }, (finished) => {
        "worklet";
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [opacity, markScale, contentShift, onDone]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: markScale.value }, { translateY: contentShift.value }],
  }));

  return (
    <Animated.View style={[styles.fill, { backgroundColor: t.bg }, fillStyle]} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View style={[{ alignItems: "center", gap: 18 }, contentStyle]}>
          <LogoMark size={96} />
          <Text style={[styles.wordmark, { color: t.text }]}>سمو</Text>
          <Text style={[styles.tagline, { color: t.textMuted }]}>تأجير سيارات بسعر واضح</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  wordmark: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: "center",
  },
});
