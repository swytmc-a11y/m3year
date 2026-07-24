import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LogoMark } from "@/components/logo";
import { colors, fonts } from "@/theme";

/**
 * Branded loading overlay shown briefly on cold start, on top of the app once
 * fonts are ready. Fades itself out and calls onDone when finished so the
 * host can unmount it. Purely presentational — never blocks navigation.
 */
export function AppSplash({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.9)).current;
  const contentShift = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(markScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(contentShift, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 340,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDone();
      });
    }, 1150);

    return () => clearTimeout(timer);
  }, [opacity, markScale, contentShift, onDone]);

  return (
    <Animated.View style={[styles.fill, { opacity }]} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View
          style={{
            alignItems: "center",
            gap: 18,
            transform: [{ scale: markScale }, { translateY: contentShift }],
          }}
        >
          <LogoMark size={96} />
          <Text style={styles.wordmark}>معيار</Text>
          <Text style={styles.tagline}>منصة إعلانات وتوثيق فرص الشراكة</Text>
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
    backgroundColor: colors.paper,
    zIndex: 100,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: colors.ink,
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedText,
    textAlign: "center",
  },
});
