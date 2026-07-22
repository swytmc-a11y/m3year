import { View, Text, Pressable } from "react-native";
import { colors, fonts } from "@/theme";

export function RatingStars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row-reverse" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text
          key={n}
          style={{ fontSize: size, color: n <= Math.round(value) ? colors.amber : colors.grid }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

export function RatingStarsInput({
  value,
  onChange,
  size = 30,
}: {
  value: number;
  onChange: (next: number) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: "row-reverse", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={8}>
          <Text style={{ fontSize: size, color: n <= value ? colors.amber : colors.grid }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function RatingSummaryLabel({ average, count }: { average: number; count: number }) {
  if (count === 0) {
    return (
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.mutedText }}>
        لا توجد تقييمات بعد
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
      <RatingStars value={average} />
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink }}>
        {average.toFixed(1)} ({count})
      </Text>
    </View>
  );
}
