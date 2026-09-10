import { View, Text, Image } from "react-native";
import type { ColorValue } from "react-native";
import { fonts } from "@/theme";
import { useTheme } from "@/contexts/theme";

// The سمو mark, cropped straight from the brand identity sheet rather than
// redrawn — see assets/brand for the source crops. `mark-flat` is a single
// black silhouette recoloured at runtime with `tintColor` (works for both
// themes off one file); the two `mark-color-*` variants are pre-rendered
// because their green ribbon must stay green while only the road inverts,
// which `tintColor` can't do selectively.
const MARK_FLAT = require("@/assets/brand/mark-flat.png");
const MARK_COLOR_ON_LIGHT = require("@/assets/brand/mark-color-on-light.png");
const MARK_COLOR_ON_DARK = require("@/assets/brand/mark-color-on-dark.png");

/**
 * The سمو mark, flat and single-toned so it takes the current text colour in
 * both themes and stays sharp at any size — used inline, wherever the mark
 * sits next to body text (nav headers, the profile and home screens).
 *
 * For the full two-tone mark (the ribbon's brand green + an adaptive road),
 * reserved for moments that are actually about the brand rather than
 * navigation — the splash screen, onboarding, and the auth/signup screens —
 * see `LogoMarkColor` below.
 */
export function LogoMark({ size = 28, color }: { size?: number; color?: ColorValue }) {
  const { t } = useTheme();
  return (
    <Image
      source={MARK_FLAT}
      resizeMode="contain"
      style={{ width: size, height: size, tintColor: color ?? t.text }}
      accessibilityRole="image"
    />
  );
}

/**
 * The full-colour سمو mark: the ribbon in the brand's lime gradient, and the
 * road pre-rendered for whichever theme is active — near-black on light, the
 * inverted white-road crop on dark — matching the identity sheet's own
 * "basic / inverted" pairing.
 */
export function LogoMarkColor({ size = 28 }: { size?: number }) {
  const { t } = useTheme();
  const onDark = t.mode === "dark";
  return (
    <Image
      source={onDark ? MARK_COLOR_ON_DARK : MARK_COLOR_ON_LIGHT}
      resizeMode="contain"
      style={{ width: size, height: size }}
      accessibilityRole="image"
    />
  );
}

/** Brand mark + "سمو" wordmark, laid out for RTL. */
export function Logo({ size = 26 }: { size?: number }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 9 }}>
      <Text
        style={{
          fontFamily: fonts.displayBold,
          fontSize: size,
          color: t.text,
          // The wordmark is three letters; a little tracking keeps it from
          // reading as a single squat block.
          letterSpacing: 0.5,
        }}
      >
        سمو
      </Text>
      <LogoMark size={size * 0.95} />
    </View>
  );
}
