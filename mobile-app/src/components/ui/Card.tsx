import {
  AccessibilityRole,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, shadow, spacing } from "../../theme/tokens";

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  // Forwarded to the touchable so a tappable card announces itself as one
  // action with one label, instead of leaking its inner Text nodes to a
  // screen reader as separate, contextless items.
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}

// Layout props that must live on the OUTER touchable when the card is
// pressable — otherwise `flex: 1` (two role cards side by side on the
// Register screen), margins, or an explicit width have no effect and the
// row overflows the screen. Everything else (padding, background, border,
// the selected-state overrides) stays on the inner view.
const OUTER_LAYOUT_KEYS = [
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
] as const;

export default function Card({
  children,
  onPress,
  style,
  elevated = true,
  accessibilityRole,
  accessibilityLabel,
}: Props) {
  if (!onPress) {
    return <View style={[styles.card, elevated && shadow.sm, style]}>{children}</View>;
  }

  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  for (const k of OUTER_LAYOUT_KEYS) {
    if (flat[k] !== undefined) outer[k] = flat[k];
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
      style={outer}
    >
      <View style={[styles.card, styles.fill, elevated && shadow.sm, style]}>{children}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  // Inner view fills the (possibly flex-stretched) touchable.
  fill: { flexGrow: 1 },
});
