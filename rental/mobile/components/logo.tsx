import { View, Text, Image } from "react-native";
import { fonts } from "@/theme";
import { useTheme } from "@/contexts/theme";

const MARK_LIGHT = require("../assets/logo-mark.png");
const MARK_DARK = require("../assets/logo-mark-dark.png");

/**
 * The brand mark on its own (the measuring brackets), sourced from the real
 * logo. Two pre-tinted assets (not one dynamically-tinted image) because a
 * flat indigo #4338CA reads too muted against the near-black dark surface —
 * dark mode uses the lighter #7C74E8 that matches darkTokens.primary.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  const { isDark } = useTheme();
  return (
    <Image
      source={isDark ? MARK_DARK : MARK_LIGHT}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

/** Brand mark + "معيار" wordmark, laid out for RTL. */
export function Logo({ size = 26 }: { size?: number }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
      <Text
        style={{
          fontFamily: fonts.displayBold,
          fontSize: size,
          color: t.text,
        }}
      >
        معيار
      </Text>
      <LogoMark size={size * 0.95} />
    </View>
  );
}
