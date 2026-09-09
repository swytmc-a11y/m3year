import { View, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { ColorValue } from "react-native";
import { fonts } from "@/theme";
import { useTheme } from "@/contexts/theme";

/**
 * The سمو mark: a road drawn in perspective, its edges converging on a
 * vanishing point with the centre line receding into it.
 *
 * Drawn rather than shipped as an image so it takes the current text colour
 * in both themes and stays sharp at any size — the previous identity needed
 * two pre-tinted PNGs to survive dark mode.
 */
export function LogoMark({ size = 28, color }: { size?: number; color?: ColorValue }) {
  const { t } = useTheme();
  const stroke = color ?? t.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      {/* The two verges, converging as they recede. */}
      <Path
        d="M5 20.5 L10.2 5.5"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M19 20.5 L13.8 5.5"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      {/* Centre line: each dash shorter than the last, and the gaps closing
          with them, so the road reads as receding rather than as a column
          of dots. Each also thins as it goes: dashes of one weight read as a
          flat pattern no matter how their lengths change. */}
      <Path d="M12 20.6 L12 16.9" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 14.7 L12 12.1" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M12 10.3 L12 8.9" stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
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
