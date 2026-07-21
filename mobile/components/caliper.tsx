import { View } from "react-native";
import { colors } from "@/theme";

// The caliper brand mark: two opposing bracket "jaws" of a measuring tool.
// Approximates the web CSS pseudo-element version with two bordered views.
export function Caliper({
  color = colors.verify,
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  const h = size;
  const w = size * 0.42;
  const bw = Math.max(2, size * 0.14);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: w,
          height: h,
          borderColor: color,
          borderWidth: bw,
          borderRightWidth: 0,
          borderTopLeftRadius: size * 0.35,
          borderBottomLeftRadius: size * 0.35,
          transform: [{ skewY: "-6deg" }],
        }}
      />
      <View
        style={{
          width: w,
          height: h,
          borderColor: color,
          borderWidth: bw,
          borderLeftWidth: 0,
          borderTopRightRadius: size * 0.35,
          borderBottomRightRadius: size * 0.35,
          transform: [{ skewY: "6deg" }],
        }}
      />
    </View>
  );
}
