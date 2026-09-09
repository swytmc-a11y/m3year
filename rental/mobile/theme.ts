// Smo (سمو) brand system.
//
// `colors`/`fonts` below are the legacy static palette — kept unchanged so
// screens not yet migrated to the new identity keep working. New screens
// should use `useTheme()` (contexts/theme.tsx) for the light/dark-aware
// `palette` tokens defined here instead.
export const colors = {
  ink: "#142C2D",
  verify: "#5E7A36",
  amber: "#D5F46B",
  paper: "#F7F9F8",
  grid: "#E5EAE7",
  white: "#FFFFFF",
  danger: "#B42318",
  dangerBg: "#FEECEB",
  mutedText: "#6D797A",
  subtleText: "#4D6054",
};

export const fonts = {
  // Legacy — still used by screens not yet migrated to the new identity.
  heading: "Almarai_800ExtraBold",
  headingBold: "Almarai_700Bold",
  body: "IBMPlexSansArabic_400Regular",
  bodyMedium: "IBMPlexSansArabic_500Medium",
  bodySemiBold: "IBMPlexSansArabic_600SemiBold",
  bodyBold: "IBMPlexSansArabic_700Bold",
  mono: "IBMPlexMono_500Medium",
  monoSemiBold: "IBMPlexMono_600SemiBold",
  // New identity — headings/labels in Alexandria, all financial numbers in
  // JetBrains Mono (tabular figures keep columns of numbers from jittering).
  display: "Alexandria_600SemiBold",
  displayBold: "Alexandria_700Bold",
  numeric: "JetBrainsMono_500Medium",
  numericBold: "JetBrainsMono_700Bold",
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

// ---- New identity: light/dark design tokens ----
//
// Smo uses a deep evergreen base and a clear lime action colour.
// "success" is a dedicated, separate color for the "موثّق" (verified) trust
// state — it must never double as the brand accent, so a verified badge and
// a "tap here" button never compete for the same color meaning.
export type ThemeTokens = {
  mode: "light" | "dark";
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  success: string;
  successTint: string;
  danger: string;
  dangerTint: string;
  white: string;
  shadowSm: ReturnType<typeof shadow>;
  shadowMd: ReturnType<typeof shadow>;
  shadowLg: ReturnType<typeof shadow>;
  shadowPrimary: ReturnType<typeof shadow>;
};

const shadow = (
  color: string,
  opacity: number,
  radiusPx: number,
  elevation: number,
  offsetY = radiusPx / 3,
) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: radiusPx,
  elevation,
});

export const lightTokens = {
  mode: "light" as const,
  bg: "#F7F9F8",
  surface: "#FFFFFF",
  surface2: "#EDF3E9",
  border: "#E5EAE7",
  text: "#142C2D",
  textMuted: "#6D797A",
  primary: "#D5F46B",
  primaryPressed: "#C3E058",
  onPrimary: "#142C2D",
  success: "#5E7A36",
  successTint: "#EBF2DD",
  danger: "#DC2626",
  dangerTint: "#FDE8E8",
  white: "#FFFFFF",
  shadowSm: shadow("#142C2D", 0.05, 4, 2),
  shadowMd: shadow("#142C2D", 0.08, 12, 5),
  shadowLg: shadow("#142C2D", 0.14, 22, 10),
  shadowPrimary: shadow("#8FAE37", 0.22, 14, 8),
};

export const darkTokens: ThemeTokens = {
  mode: "dark",
  bg: "#0E2021",
  surface: "#142C2D",
  surface2: "#203B3C",
  border: "#315052",
  text: "#F7F9F8",
  textMuted: "#B8C7C2",
  primary: "#D5F46B",
  primaryPressed: "#E2FA8F",
  onPrimary: "#142C2D",
  success: "#D5F46B",
  successTint: "#294438",
  danger: "#F87171",
  dangerTint: "#3A1B1B",
  white: "#FFFFFF",
  shadowSm: shadow("#000000", 0.3, 3, 2),
  shadowMd: shadow("#000000", 0.35, 10, 5),
  shadowLg: shadow("#000000", 0.45, 20, 10),
  shadowPrimary: shadow("#D5F46B", 0.22, 14, 8),
};

// Documented motion constants (used by shared animated components) so every
// screen transition/press/list-entrance feels like one system.
export const motion = {
  screenTransitionMs: 420,
  listStaggerMs: 55,
  pressScale: 0.975,
  pressDurationMs: 140,
};
