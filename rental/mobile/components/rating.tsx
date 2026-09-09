import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { StarIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts } from "@/theme";

/**
 * Read-only stars. A partial average fills whole stars only — a half-lit
 * star reads as a rendering artefact at card size, and the numeral beside
 * it already carries the precision.
 */
export function RatingStars({
  value,
  count,
  size = 12,
  showCount = true,
}: {
  value: number | null;
  count?: number;
  size?: number;
  showCount?: boolean;
}) {
  const { t } = useTheme();
  if (value == null || !count) return null;

  const rounded = Math.round(value);

  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
      <View style={{ flexDirection: "row-reverse", gap: 1.5 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon key={i} size={size} filled={i <= rounded} color={t.warning} />
        ))}
      </View>
      <Text style={{ fontFamily: fonts.numericBold, fontSize: size - 0.5, color: t.text }}>
        {value.toFixed(1)}
      </Text>
      {showCount ? (
        <Text style={{ fontFamily: fonts.body, fontSize: size - 1.5, color: t.textMuted }}>
          ({count})
        </Text>
      ) : null}
    </View>
  );
}

const RATING_WORDS: Record<number, string> = {
  1: "سيئة",
  2: "مقبولة",
  3: "جيدة",
  4: "ممتازة",
  5: "رائعة",
};

/**
 * The tappable version used when writing a review. Deliberately large: this
 * is the primary control on its screen, not an ornament.
 */
export function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const { t } = useTheme();

  return (
    <View style={{ alignItems: "center", gap: 10 }}>
      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === i }}
            accessibilityLabel={`${i} من 5`}
            hitSlop={6}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(i);
            }}
          >
            <StarIcon size={38} filled={i <= value} color={i <= value ? t.warning : t.border} />
          </Pressable>
        ))}
      </View>
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 13,
          color: value ? t.text : t.textMuted,
        }}
      >
        {value ? RATING_WORDS[value] : "اختر تقييمك"}
      </Text>
    </View>
  );
}
