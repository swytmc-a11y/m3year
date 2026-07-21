import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from "react-native";
import { colors, fonts, radius } from "@/theme";

type ButtonVariant = "primary" | "ghost" | "verify";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary"
      ? colors.ink
      : variant === "verify"
        ? colors.verify
        : "transparent";
  const fg = variant === "ghost" ? colors.ink : colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => ({
        height: 48,
        paddingHorizontal: 24,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        backgroundColor: bg,
        borderWidth: variant === "ghost" ? 1.5 : 0,
        borderColor: colors.ink,
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        alignSelf: fullWidth ? "stretch" : "auto",
      })}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : null}
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  style,
  ...inputProps
}: { label: string; error?: string } & TextInputProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 14,
          color: colors.ink,
          textAlign: "right",
        }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.mutedText}
        {...inputProps}
        style={[
          {
            height: 48,
            borderWidth: 1,
            borderColor: error ? colors.amber : colors.grid,
            borderRadius: radius.md,
            backgroundColor: colors.white,
            paddingHorizontal: 16,
            fontSize: 15,
            fontFamily: fonts.body,
            color: colors.ink,
          },
          style,
        ]}
      />
      {error ? (
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 13,
            color: colors.amber,
            textAlign: "right",
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderColor: colors.grid,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: 24,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
