// سمو (Sumu) brand system — the car rental platform.
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

// ---- Identity: light/dark design tokens ----
//
// The brand accent is monochrome on purpose. A rental app is a wall of car
// photographs, and a saturated brand colour ends up competing with every
// one of them; near-black on light and near-white on dark stays out of the
// way and reads as considered rather than loud.
//
// It inverts between modes — "primary" is the ink in light mode and the
// paper in dark — so a filled button is always the highest-contrast thing
// on screen.
//
// The semantic colours (success/warning/danger) deliberately keep their
// hues: they carry meaning, not brand, and a monochrome warning is not a
// warning. So a verified badge and a "tap here" button never compete for
// the same colour meaning.
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
  /**
   * The lime call-to-action colour.
   *
   * Only ever a BACKGROUND, never text or an icon: against white it sits at
   * about 1.3:1, so lime lettering is effectively invisible, while lime
   * behind near-black text is around 14:1. Encoding that as "accent +
   * onAccent" keeps the pairing from being used the wrong way round.
   *
   * It is the only saturated colour in the brand, which is what makes a
   * lime button impossible to miss on a page of black, white and grey.
   */
  accent: string;
  accentPressed: string;
  onAccent: string;
  /** Pale wash of the accent, for offer cards that should feel adjacent to
   *  a CTA without shouting like one. */
  accentTint: string;
  /** The dark canvas the hero and the darker promo cards sit on. Separate
   *  from `bg` because in dark mode it has to stay distinguishable from the
   *  page behind it. */
  canvas: string;
  onCanvas: string;
  onCanvasMuted: string;
  /** The neutral bed a car photo sits on, so a studio cut-out and an
   *  ordinary photograph read as the same kind of object on the card. */
  well: string;
  success: string;
  successTint: string;
  warning: string;
  warningTint: string;
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
  // A hair warm rather than pure white: a page of white cards on a white
  // page has no edges, and warmth keeps the greys from going blue.
  bg: "#F6F6F4",
  surface: "#FFFFFF",
  surface2: "#EFEFEC",
  border: "#E3E3DF",
  text: "#111113",
  textMuted: "#6E6E73",
  primary: "#18181B",
  primaryPressed: "#35353A",
  onPrimary: "#FFFFFF",
  accent: "#C8F250",
  accentPressed: "#B4DE3C",
  onAccent: "#111113",
  accentTint: "#EDF7D4",
  canvas: "#111113",
  onCanvas: "#F1F1EF",
  onCanvasMuted: "#A0A09F",
  well: "#F2F2EF",
  success: "#16803D",
  successTint: "#E6F4EA",
  // Rating gold. Darker than a pure amber so five filled stars still meet
  // contrast against the light surface they sit on.
  warning: "#B7791F",
  warningTint: "#FDF3E0",
  danger: "#DC2626",
  dangerTint: "#FDE8E8",
  white: "#FFFFFF",
  shadowSm: shadow("#111113", 0.06, 3, 2),
  shadowMd: shadow("#111113", 0.08, 10, 5),
  shadowLg: shadow("#111113", 0.16, 20, 10),
  shadowPrimary: shadow("#111113", 0.22, 14, 8),
};

export const darkTokens: ThemeTokens = {
  mode: "dark",
  bg: "#0B0B0C",
  surface: "#161618",
  surface2: "#1F1F22",
  border: "#2B2B2F",
  text: "#F1F1EF",
  textMuted: "#9B9BA0",
  // Inverted: on a near-black screen the brightest surface is the accent.
  primary: "#F1F1EF",
  primaryPressed: "#D2D2CE",
  onPrimary: "#0B0B0C",
  // Unchanged from light mode: the lime already reads as "press me" against
  // near-black, and shifting it per mode would make the brand's one
  // saturated colour inconsistent between them.
  accent: "#C8F250",
  accentPressed: "#B4DE3C",
  onAccent: "#111113",
  // Deep olive rather than a lightened lime — a pale tint on a dark page
  // glows like a lamp and pulls the eye off the cars.
  accentTint: "#242D10",
  // Lifted off `bg` so the hero still reads as a card in dark mode.
  canvas: "#17171A",
  onCanvas: "#F1F1EF",
  onCanvasMuted: "#9B9BA0",
  well: "#1A1A1D",
  success: "#34D399",
  successTint: "#123322",
  warning: "#F0B429",
  warningTint: "#33260D",
  danger: "#F87171",
  dangerTint: "#3A1B1B",
  white: "#FFFFFF",
  shadowSm: shadow("#000000", 0.3, 3, 2),
  shadowMd: shadow("#000000", 0.35, 10, 5),
  shadowLg: shadow("#000000", 0.45, 20, 10),
  // Near-white cannot cast a glow the way indigo did; a plain dark shadow
  // keeps the button from looking like it is floating in fog.
  shadowPrimary: shadow("#000000", 0.45, 14, 8),
};

// Documented motion constants (used by shared animated components) so every
// screen transition/press/list-entrance feels like one system.
export const motion = {
  screenTransitionMs: 420,
  listStaggerMs: 55,
  pressScale: 0.975,
  pressDurationMs: 140,
};
