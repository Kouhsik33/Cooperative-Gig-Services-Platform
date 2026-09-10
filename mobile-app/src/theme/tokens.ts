// Centralized design tokens (Sahakarya 60|30|10 Indian Color Palette System)
// 60% Vanilla Cream (#FFF6E8) — light, warm, soothing canvas and clean surfaces
// 30% Cherry Velvet (#C1121F) — rich royal cherry brand structure, buttons, headers
// 10% Sky Powder (#A9C6EA) & Golden Typography (#C59B27 / #D4AF37) — luxury accents & highlights

export const colors = {
  // 30% Structural Brand: Cherry Velvet
  primary: "#C1121F",
  primaryDark: "#980F19",
  primaryLight: "#FDE8EA",

  // 10% Accent: Sky Powder
  secondary: "#A9C6EA",
  secondaryDark: "#7FA7D9",
  secondaryLight: "#EBF2FA",
  sky: "#A9C6EA",
  skyLight: "#EBF2FA",
  skyDark: "#7FA7D9",

  // 60% Dominant: Vanilla Cream
  background: "#FFF6E8",
  vanilla: "#FFF6E8",
  vanillaLight: "#FFFBF5",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFBF5",

  // 10% Accent: Golden Typography Style & Royal Trim
  gold: "#C59B27",
  goldLight: "#FFF4D2",
  goldDark: "#9A7513",
  goldMetallic: "#D4AF37",

  // Harmonious auxiliary tones
  lime: "#D5E5B8",
  limeLight: "#F2F8E9",
  limeDark: "#A3BD79",

  yellow: "#F9DCA4",
  yellowLight: "#FFF4D2",
  yellowDark: "#C59B27",

  cyan: "#A9C6EA",
  cyanLight: "#EBF2FA",
  cyanDark: "#7FA7D9",

  purple: "#DAC8E8",
  purpleLight: "#F4EFF9",
  purpleDark: "#A48BBD",

  peach: "#FAD8C3",
  peachLight: "#FFF0E6",
  peachDark: "#CFA085",

  // Ink & deep borders
  textPrimary: "#1F1516",
  textSecondary: "#5C4A4D",
  textMuted: "#8C787B",
  textInverse: "#FFFFFF",

  success: "#15803D",
  successLight: "#F0FDF4",
  warning: "#B45309",
  warningLight: "#FFFBEB",
  error: "#C1121F",
  errorLight: "#FDE8EA",
  info: "#2563EB",
  infoLight: "#EFF6FF",

  border: "#1F1516",
  borderStrong: "#1F1516",
  ink: "#1F1516",

  overlayOnDark: "rgba(255, 255, 255, 0.2)",
  skeleton: "#F2E8D8",
  skeletonHighlight: "#FAF2E6",

  // Semantic aliases
  primaryForeground: "#FFFFFF",
  accent: "#C59B27",
  accentForeground: "#1F1516",
  onPrimarySurface: "#FFFFFF",
  shadowTint: "#1F1516",
} as const;

export const borders = {
  thin: 1.5,
  default: 2.2,
  thick: 3,
  color: "#1F1516",
} as const;

export const avatarPalette = [
  colors.primary,
  colors.sky,
  colors.gold,
  colors.peach,
  colors.purple,
  colors.lime,
  colors.secondary,
] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const layout = {
  minTouchTarget: 44,
  stickyBarClearance: 96,
} as const;

export const type = {
  display: { fontFamily: "Kaltera", fontSize: 34, lineHeight: 40 },
  h1: { fontFamily: "Kaltera", fontSize: 26, lineHeight: 32 },
  h2: { fontFamily: "Kaltera", fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: "Kaltera", fontSize: 17, lineHeight: 22 },
  body: { fontFamily: "Kaltera", fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: "Kaltera", fontSize: 15, lineHeight: 21 },
  small: { fontFamily: "Kaltera", fontSize: 13, lineHeight: 18 },
  smallMedium: { fontFamily: "Kaltera", fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: "Kaltera", fontSize: 11, lineHeight: 15 },
  label: { fontFamily: "Kaltera", fontSize: 11, lineHeight: 14, letterSpacing: 0.6 },
} as const;

// Hard Neobrutalist Offset Shadows with ZERO blur
export const shadow = {
  sm: {
    shadowColor: "#1F1516",
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  md: {
    shadowColor: "#1F1516",
    shadowOffset: { width: 3.5, height: 3.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  lg: {
    shadowColor: "#1F1516",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
} as const;

export const theme = { colors, borders, spacing, radius, type, shadow, avatarPalette, layout };
export default theme;
