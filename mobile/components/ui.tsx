import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  const scale = useRef(new Animated.Value(1)).current;

  const bg =
    variant === "primary"
      ? colors.ink
      : variant === "verify"
        ? colors.verify
        : "transparent";
  const fg = variant === "ghost" ? colors.ink : colors.white;

  const springTo = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  return (
    <Animated.View
      style={{ alignSelf: fullWidth ? "stretch" : "auto", transform: [{ scale }] }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={isDisabled ? undefined : onPress}
        onPressIn={() => !isDisabled && springTo(0.97)}
        onPressOut={() => springTo(1)}
        style={{
          height: 52,
          paddingHorizontal: 24,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          backgroundColor: bg,
          borderWidth: variant === "ghost" ? 1.5 : 0,
          borderColor: colors.ink,
          opacity: isDisabled ? 0.5 : 1,
          // subtle elevation for solid buttons
          shadowColor: variant === "ghost" ? "transparent" : colors.ink,
          shadowOpacity: 0.18,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 10,
          elevation: variant === "ghost" ? 0 : 2,
        }}
      >
        {loading ? <ActivityIndicator color={fg} size="small" /> : null}
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: fg }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function Field({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: { label: string; error?: string } & TextInputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? colors.amber
    : focused
      ? colors.ink
      : colors.grid;

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
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...inputProps}
        style={[
          {
            height: 52,
            borderWidth: focused ? 1.5 : 1,
            borderColor,
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

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 0 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 0 }).start()
        }
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        hitSlop={6}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          minHeight: 36,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: active ? colors.ink : colors.grid,
          backgroundColor: active ? colors.ink : colors.white,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 13,
            color: active ? colors.white : colors.subtleText,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function TopBar({
  title,
  onBack,
  right,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.grid,
      }}
    >
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            <Text style={{ fontSize: 22, color: colors.ink }}>→</Text>
          </Pressable>
        ) : null}
        {title ? (
          <Text
            style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.ink }}
          >
            {title}
          </Text>
        ) : null}
      </View>
      {right}
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
