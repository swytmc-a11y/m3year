// Miyar (معيار) brand system — "precision measuring tools" direction.
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
  heading: "Almarai_800ExtraBold",
  headingBold: "Almarai_700Bold",
  body: "IBMPlexSansArabic_400Regular",
  bodyMedium: "IBMPlexSansArabic_500Medium",
  bodySemiBold: "IBMPlexSansArabic_600SemiBold",
  bodyBold: "IBMPlexSansArabic_700Bold",
  mono: "IBMPlexMono_500Medium",
  monoSemiBold: "IBMPlexMono_600SemiBold",
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
};

export const spacing = (n: number) => n * 4;
