import { View, Text } from "react-native";
import { StarIcon } from "@/components/icons";
import { Tappable } from "@/components/kit";
import { useTheme } from "@/contexts/theme";
import { fonts } from "@/theme";

/**
 * Ratings use the shared StarIcon rather than the "★" text glyph, so the shape
 * and optical weight match the rest of the icon set on every platform instead
 * of following whatever emoji font the OS happens to ship.
 */
export function RatingStars({ value, size = 14 }: { value: number; size?: number }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} color={n <= Math.round(value) ? t.primary : t.border} />
      ))}
    </View>
  );
}

export function RatingStarsInput({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (next: number) => void;
  size?: number;
}) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row-reverse", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Tappable
          key={n}
          onPress={() => onChange(n)}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel={`${n} من 5`}
          accessibilityState={{ selected: n <= value }}
        >
          <StarIcon size={size} color={n <= value ? t.primary : t.border} />
        </Tappable>
      ))}
    </View>
  );
}

export function RatingSummaryLabel({ average, count }: { average: number; count: number }) {
  const { t } = useTheme();
  if (count === 0) {
    return (
      <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted }}>لا توجد تقييمات بعد</Text>
    );
  }
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
      <RatingStars value={average} />
      <Text style={{ fontFamily: fonts.numeric, fontSize: 11.5, color: t.text }}>
        {average.toFixed(1)} ({count})
      </Text>
    </View>
  );
}
