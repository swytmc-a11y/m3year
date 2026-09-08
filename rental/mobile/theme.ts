// Miyar (معيار) brand system.
//
// `colors`/`fonts` below are the legacy static palette — kept unchanged so
// screens not yet migrated to the new identity keep working. New screens
// should use `useTheme()` (contexts/theme.tsx) for the light/dark-aware
// `palette` tokens defined here instead.
export const colors = {
  ink: "#171A1C", // primary text / dark surfaces
  verify: "#0F6B66", // "موثّق" badge, success
  amber: "#D9762B", // critical numbers, primary buttons accent
  paper: "#EDEEE9", // page background (engineering paper)
  grid: "#C7CBC6", // hairlines / borders
  white: "#FFFFFF",
  danger: "#B42318",
  dangerBg: "#FEECEB",
  mutedText: "#75807C",
  subtleText: "#4B5250",
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
// One brand accent (indigo) used only for interactive/brand elements.
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
  bg: "#F5F5F1",
  surface: "#FFFFFF",
  surface2: "#EDEDE8",
  border: "#E7E6E1",
  text: "#14161A",
  textMuted: "#6B7075",
  primary: "#4338CA",
  primaryPressed: "#332CAA",
  onPrimary: "#FFFFFF",
  success: "#16803D",
  successTint: "#E6F4EA",
  danger: "#DC2626",
  dangerTint: "#FDE8E8",
  white: "#FFFFFF",
  shadowSm: shadow("#14161A", 0.06, 3, 2),
  shadowMd: shadow("#14161A", 0.08, 10, 5),
  shadowLg: shadow("#14161A", 0.16, 20, 10),
  shadowPrimary: shadow("#4338CA", 0.25, 14, 8),
};

export const darkTokens: ThemeTokens = {
  mode: "dark",
  bg: "#101014",
  surface: "#1B1C20",
  surface2: "#232429",
  border: "#2E2F34",
  text: "#EDEDE8",
  textMuted: "#9A9D9F",
  primary: "#7C74E8",
  primaryPressed: "#9A93EE",
  onPrimary: "#101014",
  success: "#34D399",
  successTint: "#123322",
  danger: "#F87171",
  dangerTint: "#3A1B1B",
  white: "#FFFFFF",
  shadowSm: shadow("#000000", 0.3, 3, 2),
  shadowMd: shadow("#000000", 0.35, 10, 5),
  shadowLg: shadow("#000000", 0.45, 20, 10),
  shadowPrimary: shadow("#7C74E8", 0.35, 14, 8),
};

// Documented motion constants (used by shared animated components) so every
// screen transition/press/list-entrance feels like one system.
export const motion = {
  screenTransitionMs: 420,
  listStaggerMs: 55,
  pressScale: 0.975,
  pressDurationMs: 140,
};
