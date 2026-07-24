import { View, Text, Image } from "react-native";
import { colors, fonts } from "@/theme";

const MARK = require("../assets/logo-mark.png");

/** The brand mark on its own (the two teal brackets), sourced from the real logo. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      source={MARK}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

/** Brand mark + "معيار" wordmark, laid out for RTL. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
      <Text
        style={{
          fontFamily: fonts.heading,
          fontSize: size,
          color: colors.ink,
        }}
      >
        معيار
      </Text>
      <LogoMark size={size * 0.95} />
    </View>
  );
}
