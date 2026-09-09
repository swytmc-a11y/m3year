import { View, Text } from "react-native";
import { fonts } from "@/theme";
import { useTheme } from "@/contexts/theme";

/** The three rising bars are Smo's compact route/forward-motion mark. */
export function LogoMark({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  const { t } = useTheme();
  const color = inverted ? t.primary : t.text;
  return (
    <View
      accessibilityLabel="شعار سمو"
      style={{
        width: size,
        height: size,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: Math.max(2, size * 0.1),
        transform: [{ skewX: "-14deg" }],
      }}
    >
      {[0.5, 0.76, 1].map((height, index) => (
        <View
          key={index}
          style={{
            width: size * 0.2,
            height: size * height,
            borderRadius: Math.max(1, size * 0.06),
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

export function Logo({ size = 30, inverted = false }: { size?: number; inverted?: boolean }) {
  const { t } = useTheme();
  const color = inverted ? t.white : t.text;
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 9 }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: size, color, letterSpacing: -1 }}>
        سمو
      </Text>
      <LogoMark size={size * 0.82} inverted={inverted} />
    </View>
  );
}
