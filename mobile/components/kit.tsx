import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewProps,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { ChevronBackIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts, motion, radius, type ThemeTokens } from "@/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ---- press feedback ----
//
// Every tappable surface in the new identity presses the same way: scale to
// motion.pressScale over motion.pressDurationMs, on the UI thread (worklet),
// so it stays smooth under any JS-thread load (network calls, list scroll).
function usePressScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    scale.value = withTiming(motion.pressScale, { duration: motion.pressDurationMs });
  };
  const onPressOut = () => {
    scale.value = withTiming(1, { duration: motion.pressDurationMs });
  };
  return { style, onPressIn, onPressOut };
}

function tapHaptic(kind: "light" | "medium" | "success" = "light") {
  if (Platform.OS === "web") return;
  if (kind === "success") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else {
    Haptics.impactAsync(
      kind === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  }
}

type TapProps = Omit<PressableProps, "style"> & {
  style?: ViewProps["style"];
  haptic?: "light" | "medium" | "success" | "none";
};

/** Any pressable surface, with the shared UI-thread press-scale built in. */
export function Tappable({ children, onPressIn, onPressOut, onPress, haptic = "light", style, ...rest }: TapProps) {
  const press = usePressScale();
  return (
    <Animated.View style={[style, press.style]}>
      <Pressable
        onPress={(e) => {
          if (haptic !== "none") tapHaptic(haptic);
          onPress?.(e);
        }}
        onPressIn={(e) => {
          press.onPressIn();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          press.onPressOut();
          onPressOut?.(e);
        }}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ---- Button ----
type ButtonVariant = "primary" | "secondary" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}) {
  const { t } = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === "primary" ? t.primary : variant === "danger" ? "transparent" : "transparent";
  const fg = variant === "primary" ? t.onPrimary : variant === "danger" ? t.danger : t.text;
  const borderColor = variant === "secondary" ? t.border : variant === "danger" ? `${t.danger}40` : "transparent";

  return (
    <Tappable
      onPress={isDisabled ? undefined : onPress}
      haptic={isDisabled ? "none" : "light"}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={{ alignSelf: fullWidth ? "stretch" : "auto" }}
    >
      <View
        style={{
          minHeight: 50,
          paddingHorizontal: 24,
          borderRadius: radius.lg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          backgroundColor: bg,
          borderWidth: variant === "primary" ? 0 : 1,
          borderColor,
          opacity: isDisabled ? 0.5 : 1,
          ...(variant === "primary" ? t.shadowPrimary : {}),
        }}
      >
        {loading ? (
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: `${fg}55`,
              borderTopColor: fg,
            }}
          />
        ) : (
          icon
        )}
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: fg }}>{label}</Text>
      </View>
    </Tappable>
  );
}

// ---- IconButton (circular, surface bg — bell, back, favorite...) ----
export function IconButton({
  onPress,
  children,
  accessibilityLabel,
  badge = false,
  size = 40,
  tone = "surface",
}: {
  onPress?: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
  badge?: boolean;
  size?: number;
  tone?: "surface" | "primary";
}) {
  const { t } = useTheme();
  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      haptic="light"
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone === "primary" ? t.primary : t.surface,
          alignItems: "center",
          justifyContent: "center",
          ...(tone === "primary" ? t.shadowPrimary : t.shadowSm),
        }}
      >
        {children}
        {badge ? (
          <View
            style={{
              position: "absolute",
              top: size * 0.18,
              left: size * 0.2,
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: t.danger,
              borderWidth: 1.5,
              borderColor: t.surface,
            }}
          />
        ) : null}
      </View>
    </Tappable>
  );
}

// ---- Card ----
export function Card({ style, children, ...rest }: ViewProps) {
  const { t } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.surface,
          borderRadius: radius.xl,
          padding: 16,
          ...t.shadowSm,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

// ---- Chip ----
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <View
        style={{
          paddingHorizontal: 14,
          minHeight: 36,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: active ? t.text : t.border,
          backgroundColor: active ? t.text : t.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: active ? t.bg : t.textMuted }}>
          {label}
        </Text>
      </View>
    </Tappable>
  );
}

// ---- SegmentedControl ----
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: t.surface2,
        borderRadius: radius.lg,
        padding: 3,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <SegmentedOption
            key={opt.value}
            label={opt.label}
            active={active}
            onPress={() => onChange(opt.value)}
          />
        );
      })}
    </View>
  );
}

function SegmentedOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { t } = useTheme();
  const highlight = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    highlight.value = withTiming(active ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [active, highlight]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: active ? t.primary : "transparent",
    transform: [{ scale: 0.97 + highlight.value * 0.03 }],
  }));

  return (
    <Tappable onPress={onPress} haptic="light" style={{ flex: 1 }} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Animated.View
        style={[
          {
            minHeight: 34,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      >
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: active ? t.onPrimary : t.textMuted }}>
          {label}
        </Text>
      </Animated.View>
    </Tappable>
  );
}

// ---- StatCard ----
export function StatCard({ value, label, tone = "text" }: { value: string; label: string; tone?: "text" | "primary" }) {
  const { t } = useTheme();
  return (
    <Card style={{ flex: 1, alignItems: "center", padding: 12, gap: 2 }}>
      <Text style={{ fontFamily: fonts.numericBold, fontSize: 16, color: tone === "primary" ? t.primary : t.text }}>
        {value}
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 10, color: t.textMuted }}>{label}</Text>
    </Card>
  );
}

// ---- ProgressSteps (verification status) ----
export function ProgressSteps({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row-reverse", gap: 4 }}>
        {steps.map((_, i) => (
          <ProgressSegment key={i} filled={i <= currentIndex} />
        ))}
      </View>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
        {steps.map((label, i) => (
          <Text
            key={label}
            style={{
              fontFamily: fonts.body,
              fontSize: 9.5,
              color: i <= currentIndex ? t.text : t.textMuted,
              flex: 1,
              textAlign: i === 0 ? "right" : i === steps.length - 1 ? "left" : "center",
            }}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ProgressSegment({ filled }: { filled: boolean }) {
  const { t } = useTheme();
  const progress = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(filled ? 1 : 0, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [filled, progress]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? t.primary : t.surface2,
  }));
  return <Animated.View style={[{ flex: 1, height: 5, borderRadius: 3 }, style]} />;
}

// ---- Skeleton (loading placeholder — opacity pulse, no extra deps) ----
export function Skeleton({ width, height, radius: r = radius.md }: { width: number | `${number}%`; height: number; radius?: number }) {
  const { t } = useTheme();
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1, true);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: t.surface2 }, style]} />;
}

// ---- DrawnCheckmark (verified badge — the check strokes itself in) ----
export function DrawnCheckmark({ size = 10, color = "#fff", play = true }: { size?: number; color?: string; play?: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = play
      ? withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
      : 1;
  }, [play, progress]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 24 * (1 - progress.value),
  }));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath
        d="M5 13l4 4L19 7"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={24}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

// ---- AnimatedNumber (smooth tween between values, tabular mono) ----
export function AnimatedNumber({
  value,
  formatter,
  style,
}: {
  value: number;
  formatter: (n: number) => string;
  style?: React.ComponentProps<typeof Text>["style"];
}) {
  const [display, setDisplay] = useState(formatter(value));
  const animated = useSharedValue(value);

  useEffect(() => {
    animated.value = withTiming(value, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [value, animated]);

  useAnimatedReaction(
    () => Math.round(animated.value),
    (rounded, prev) => {
      if (rounded !== prev) runOnJS(setDisplay)(formatter(rounded));
    },
    [formatter],
  );

  return (
    <Text style={[{ fontFamily: fonts.numericBold, fontVariant: ["tabular-nums"] }, style]}>{display}</Text>
  );
}

// ---- staggered list entrance helper ----
// Usage: entering={staggerEnter(index)} on each row/card in a FlatList/map.
export function staggerEnter(index: number, from: "up" | "down" = "up") {
  const base = from === "up" ? FadeInUp : FadeInDown;
  return base.delay(index * motion.listStaggerMs).springify().damping(18).mass(0.6);
}

// ---- form primitives ----
//
// These replace the legacy `components/ui.tsx` Field/Chip, which were hard-wired
// to the old static palette. Everything here reads live theme tokens, so forms
// follow light/dark like the rest of the app.

export function FieldLabel({ children }: { children: string }) {
  const { t } = useTheme();
  return (
    <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: t.text, textAlign: "right" }}>
      {children}
    </Text>
  );
}

export function FieldError({ message }: { message?: string }) {
  const { t } = useTheme();
  if (!message) return null;
  return (
    <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.danger, textAlign: "right" }}>
      {message}
    </Text>
  );
}

/**
 * Themed text input. `numeric` switches to the tabular mono face and
 * left-aligns, so figures line up in a column the way they do everywhere else.
 */
export function Field({
  label,
  error,
  hint,
  numeric = false,
  multiline,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: { label?: string; error?: string; hint?: string; numeric?: boolean } & TextInputProps) {
  const { t } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? t.danger : focused ? t.primary : t.border;

  return (
    <View style={{ gap: 7 }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <TextInput
        placeholderTextColor={t.textMuted}
        multiline={multiline}
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
            borderWidth: 1,
            borderColor,
            borderRadius: radius.lg,
            backgroundColor: t.surface,
            paddingHorizontal: 14,
            fontSize: 13.5,
            fontFamily: numeric ? fonts.numeric : fonts.body,
            color: t.text,
            textAlign: numeric ? "left" : "right",
          },
          multiline
            ? { minHeight: 96, paddingTop: 12, paddingBottom: 12, textAlignVertical: "top" as const }
            : { height: 46 },
          style,
        ]}
      />
      {hint && !error ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted, textAlign: "right" }}>{hint}</Text>
      ) : null}
      <FieldError message={error} />
    </View>
  );
}

/** Checkbox row used for form confirmations and boolean options. */
export function CheckRow({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Tappable
      onPress={onPress}
      haptic="light"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ alignSelf: "stretch" }}
    >
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 5 }}>
        <View
          style={{
            width: 21,
            height: 21,
            borderRadius: radius.sm,
            borderWidth: 1.5,
            borderColor: checked ? t.primary : t.border,
            backgroundColor: checked ? t.primary : t.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked ? <DrawnCheckmark size={13} color={t.onPrimary} /> : null}
        </View>
        <Text
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: t.text, textAlign: "right", lineHeight: 19 }}
        >
          {label}
        </Text>
      </View>
    </Tappable>
  );
}

// ---- Sheet (bottom sheet) ----
//
// Modal unmounts its children the instant `visible` flips false, so a Reanimated
// `exiting` animation would never get to play. We let Modal own the fade-out and
// use Reanimated only for the spring-up entrance.
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityLabel="إغلاق"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]}
        />
        <Animated.View
          entering={SlideInDown.springify().damping(20).mass(0.7)}
          style={{
            backgroundColor: t.bg,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            paddingBottom: insets.bottom + 12,
            maxHeight: "88%",
            ...t.shadowLg,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: t.border }} />
          </View>
          {title ? (
            <Text
              style={{
                fontFamily: fonts.displayBold,
                fontSize: 15,
                color: t.text,
                textAlign: "center",
                paddingHorizontal: 20,
                paddingTop: 6,
                paddingBottom: 10,
              }}
            >
              {title}
            </Text>
          ) : null}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 18, paddingTop: 6 }}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---- MenuCard (grouped settings/navigation rows) ----
export type MenuItem = {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  value?: string;
  danger?: boolean;
};

export function MenuCard({ items }: { items: MenuItem[] }) {
  const { t } = useTheme();
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {items.map((item, idx) => (
        <Tappable key={item.label} onPress={item.onPress} haptic="light">
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 11,
              paddingHorizontal: 14,
              paddingVertical: 12,
              minHeight: 46,
              borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
              borderTopColor: t.border,
            }}
          >
            {item.icon ? (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.md,
                  backgroundColor: item.danger ? t.dangerTint : t.surface2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </View>
            ) : null}
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.bodyMedium,
                fontSize: 12.5,
                color: item.danger ? t.danger : t.text,
                textAlign: "right",
              }}
            >
              {item.label}
            </Text>
            {item.value ? (
              <Text style={{ fontFamily: fonts.numeric, fontSize: 11, color: t.textMuted }}>{item.value}</Text>
            ) : null}
            <ChevronBackIcon color={t.textMuted} size={13} />
          </View>
        </Tappable>
      ))}
    </Card>
  );
}

// ---- EmptyState (one consistent shape for every "nothing here yet") ----
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const { t } = useTheme();
  return (
    <Card style={{ padding: 28, alignItems: "center", gap: 9 }}>
      {icon ? (
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: radius.xl,
            backgroundColor: t.surface2,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 2,
          }}
        >
          {icon}
        </View>
      ) : null}
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "center" }}>{title}</Text>
      {description ? (
        <Text
          style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "center", lineHeight: 20 }}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
    </Card>
  );
}

// ---- Toast ----
type ToastKind = "success" | "error" | "info";
type ToastState = { message: string; kind: ToastKind } | null;

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

/** Fire a transient confirmation/error banner: `toast("تم الحفظ", "success")`. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        kind === "error"
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const bg = toast?.kind === "error" ? t.danger : toast?.kind === "success" ? t.success : t.text;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          entering={FadeInDown.springify().damping(18).mass(0.6)}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + 96,
            backgroundColor: bg,
            borderRadius: radius.lg,
            paddingHorizontal: 16,
            paddingVertical: 12,
            ...t.shadowLg,
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: t.white, textAlign: "center" }}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

// ---- themed pull-to-refresh colors ----
// RefreshControl needs per-platform props to be tinted; centralise so every
// list refreshes with the same brand spinner instead of the OS default gray.
export function useRefreshTint() {
  const { t } = useTheme();
  return useMemo(
    () => ({ tintColor: t.primary, colors: [t.primary], progressBackgroundColor: t.surface }),
    [t],
  );
}

export type { ThemeTokens };
