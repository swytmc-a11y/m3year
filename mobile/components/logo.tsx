import { View, Text } from "react-native";
import { Caliper } from "@/components/caliper";
import { colors, fonts } from "@/theme";

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
      <Text
        style={{
          fontFamily: fonts.heading,
          fontSize: size,
          color: colors.ink,
        }}
      >
        معيار
      </Text>
      <Caliper color={colors.verify} size={size * 0.8} />
    </View>
  );
}
