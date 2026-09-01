// Centralized design tokens (master build prompt §37). Every screen and
// component should read colors/spacing/radius/type/shadows from here —
// never hardcode a hex value or magic number in a StyleSheet again.
//
// Palette direction: deep cooperative teal (trust, institution) + warm
// terracotta accent (human warmth) + warm-neutral surfaces, applied on
// a 60/30/10 basis (neutral / primary / accent+semantic).

export const colors = {
  primary: "#0F6B5C",
  primaryDark: "#0A4F44",
  primaryLight: "#E3F3EF",

  secondary: "#C97B3D",
  secondaryDark: "#A85F27",
  secondaryLight: "#FBEEE0",

  background: "#F7F8F6",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  textPrimary: "#1A2421",
  textSecondary: "#5B6B65",
  textMuted: "#8A9A94",
  textInverse: "#FFFFFF",

  success: "#1E8E5A",
  successLight: "#E5F5EC",
  warning: "#B7791F",
  warningLight: "#FBF0DA",
  error: "#D64545",
  errorLight: "#FBEAEA",
  info: "#2F6FB0",
  infoLight: "#E8F1FA",

  border: "#E4E7E4",
  borderStrong: "#CBD3CE",

  gold: "#D9A404",

  // Translucent white for overlays on a saturated background (e.g. the
  // emergency hero card), kept here so no screen invents its own rgba().
  overlayOnDark: "rgba(255, 255, 255, 0.15)",
  // Skeleton placeholder fill — a neutral tint of the border colour, so
  // loading blocks read as "content pending", not as a disabled control.
  skeleton: "#E9ECE9",
  skeletonHighlight: "#F3F5F2",

  // --- Semantic aliases -------------------------------------------------
  // Named by ROLE rather than by hue, so a component says what it means
  // ("text on top of a primary surface") instead of restating the palette.
  // Re-theming then only touches the values above.
  primaryForeground: "#FFFFFF",
  accent: "#C97B3D",
  accentForeground: "#FFFFFF",
  onPrimarySurface: "#0A4F44",
  shadowTint: "#0A231D",
} as const;

// Deterministic avatar-placeholder palette (master prompt §44). These are
// the theme's own hues rather than seven hand-copied hex literals, so
// re-theming the app re-themes the avatars with it.
export const avatarPalette = [
  colors.primary,
  colors.secondary,
  colors.info,
  colors.secondaryDark,
  colors.textSecondary,
  colors.warning,
  colors.success,
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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

// Layout invariants that are accessibility requirements, not taste.
export const layout = {
  /** WCAG 2.5.5 / iOS HIG minimum tappable edge. Any bare touchable must
   *  reach this, via size or hitSlop. */
  minTouchTarget: 44,
  /** Space reserved under a sticky CTA bar so content can scroll clear. */
  stickyBarClearance: 96,
} as const;

// Golden-ratio-inspired type scale.
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: "700" as const },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: "700" as const },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "400" as const },
  bodyMedium: { fontSize: 15, lineHeight: 21, fontWeight: "600" as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  smallMedium: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: "500" as const },
  /** Uppercase micro-label for section eyebrows and metadata rows. */
  label: { fontSize: 11, lineHeight: 14, fontWeight: "700" as const, letterSpacing: 0.6 },
} as const;

export const shadow = {
  sm: {
    shadowColor: colors.shadowTint,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: colors.shadowTint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.shadowTint,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export const theme = { colors, spacing, radius, type, shadow, avatarPalette, layout };
export default theme;
