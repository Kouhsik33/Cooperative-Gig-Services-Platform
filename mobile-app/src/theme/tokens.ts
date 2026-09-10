import { Platform } from "react-native";

// ============================================================================
// 🎨 ROOT THEME PALETTE CONFIGURATION
// "CASSETTE TAPE" Retro Nostalgic Theme (Combo #6)
//
// 💡 TO CHANGE COLOR PALETTES FOR THE ENTIRE APP:
// Simply modify the hex values in the PALETTE object below!
// Everything else in mobile-app automatically inherits from this.
// ============================================================================

export const PALETTE = {
  // 60% Dominant Canvas (Dusty Pale Ice White / Light Canvas)
  canvas: "#EDF2F4",

  // 30% Deep Slate Navy Contrast (Ink, Text, Borders, Solid Shadows)
  ink: "#2B2D42",

  // 10% Vibrant Retro Accent (Electric Crimson Red for Buttons, Badges, CTAs)
  primary: "#EF233C",
  primaryDark: "#D90429",
  primaryLight: "#FDEDF0",

  // Secondary Steel Blue (Muted Slate / Category Chips / Accent Pills)
  secondary: "#8D99AE",
  secondaryDark: "#606D80",
  secondaryLight: "#E6EAEE",

  // Surfaces
  surface: "#FFFFFF",
  surfaceElevated: "#F8FAFB",

  // Neobrutalist Line & Shadow System
  border: "#2B2D42",
  shadow: "#2B2D42",
} as const;

export const colors = {
  // 10% Hero Accent & Primary CTAs: Vibrant Crimson Red (#EF233C)
  primary: PALETTE.primary,
  primaryDark: PALETTE.primaryDark,
  primaryLight: PALETTE.primaryLight,

  // Secondary Steel Blue (#8D99AE)
  secondary: PALETTE.secondary,
  secondaryDark: PALETTE.secondaryDark,
  secondaryLight: PALETTE.secondaryLight,
  sky: PALETTE.secondary,
  skyLight: PALETTE.secondaryLight,
  skyDark: PALETTE.secondaryDark,

  // 60% Dominant Base Canvas: (#EDF2F4) & Crisp Surfaces (#FFFFFF)
  background: PALETTE.canvas,
  canvas: PALETTE.canvas,
  surface: PALETTE.surface,
  surfaceElevated: PALETTE.surfaceElevated,
  vanilla: PALETTE.canvas,
  vanillaLight: PALETTE.surfaceElevated,

  // Retro Accent Trim & Auxiliary Tones
  gold: "#E09F3E",
  goldLight: "#FDF5E8",
  goldDark: "#9E6410",
  goldMetallic: "#D4AF37",

  lime: "#90BE6D",
  limeLight: "#F0F7EB",
  limeDark: "#58813B",

  yellow: "#F9C74F",
  yellowLight: "#FEF8E9",
  yellowDark: "#C59B27",

  cyan: PALETTE.secondary,
  cyanLight: PALETTE.secondaryLight,
  cyanDark: PALETTE.secondaryDark,

  purple: "#7209B7",
  purpleLight: "#F3E8F9",
  purpleDark: "#480CA8",

  peach: "#F4A261",
  peachLight: "#FDF4EC",
  peachDark: "#C46820",

  // 30% Structural Ink & Text: Deep Slate Navy (#2B2D42)
  textPrimary: PALETTE.ink,
  textSecondary: "#4A5068",
  textMuted: PALETTE.secondary,
  textInverse: "#FFFFFF",

  // Semantic Status Colors
  success: "#2B9348",
  successLight: "#EBF7EE",
  warning: "#E76F51",
  warningLight: "#FDF2EF",
  error: PALETTE.primary,
  errorLight: PALETTE.primaryLight,
  info: PALETTE.secondaryDark,
  infoLight: PALETTE.secondaryLight,

  // Borders & Ink
  border: PALETTE.border,
  borderStrong: PALETTE.border,
  ink: PALETTE.ink,

  overlayOnDark: "rgba(255, 255, 255, 0.2)",
  skeleton: "#E2E8F0",
  skeletonHighlight: PALETTE.canvas,

  // Semantic Aliases
  primaryForeground: "#FFFFFF",
  accent: PALETTE.primary,
  accentForeground: "#FFFFFF",
  onPrimarySurface: "#FFFFFF",
  shadowTint: PALETTE.shadow,
} as const;

export const borders = {
  thin: 1.5,
  default: 2.2,
  thick: 3,
  color: PALETTE.border,
} as const;

export const avatarPalette = [
  PALETTE.primary,
  PALETTE.secondary,
  "#E09F3E",
  "#F4A261",
  "#7209B7",
  "#90BE6D",
  PALETTE.ink,
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
  display: { fontFamily: "JosefinSans", fontSize: 34, lineHeight: 40 },
  h1: { fontFamily: "JosefinSans", fontSize: 26, lineHeight: 32 },
  h2: { fontFamily: "JosefinSans", fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: "JosefinSans", fontSize: 17, lineHeight: 22 },
  body: { fontFamily: "JosefinSans", fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: "JosefinSans", fontSize: 15, lineHeight: 21 },
  small: { fontFamily: "JosefinSans", fontSize: 13, lineHeight: 18 },
  smallMedium: { fontFamily: "JosefinSans", fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: "JosefinSans", fontSize: 11, lineHeight: 15 },
  label: { fontFamily: "JosefinSans", fontSize: 11, lineHeight: 14, letterSpacing: 0.6 },
  kaltera: { fontFamily: "Kaltera" },
} as const;

// Hard Neobrutalist Offset Shadows with ZERO blur (#2B2D42 Deep Slate Ink)
export const shadow = {
  sm: Platform.select({
    web: { boxShadow: `2.5px 2.5px 0px ${PALETTE.shadow}` } as any,
    default: {
      shadowColor: PALETTE.shadow,
      shadowOffset: { width: 2.5, height: 2.5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
  }),
  md: Platform.select({
    web: { boxShadow: `3.5px 3.5px 0px ${PALETTE.shadow}` } as any,
    default: {
      shadowColor: PALETTE.shadow,
      shadowOffset: { width: 3.5, height: 3.5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 5,
    },
  }),
  lg: Platform.select({
    web: { boxShadow: `5px 5px 0px ${PALETTE.shadow}` } as any,
    default: {
      shadowColor: PALETTE.shadow,
      shadowOffset: { width: 5, height: 5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 8,
    },
  }),
} as const;

export const theme = { PALETTE, colors, borders, spacing, radius, type, shadow, avatarPalette, layout };
export default theme;
