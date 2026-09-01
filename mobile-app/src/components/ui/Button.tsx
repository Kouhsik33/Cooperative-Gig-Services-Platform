import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { colors, layout, radius, spacing, type } from "../../theme/tokens";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

// One primary-action button primitive (master prompt §42 rule 1 / §9)
// with the full default/disabled/loading state set built in.
export default function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.base, VARIANT_STYLES[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.primary : colors.textInverse} />
      ) : (
        <Text
          style={[styles.label, TEXT_STYLES[variant]]}
          numberOfLines={2}
          // Hindi/Marathi labels run up to ~2x the English width; allowing
          // two centred lines is what keeps a CTA readable instead of
          // truncating it mid-word.
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    // Accessibility floor (WCAG 2.5.5 / iOS HIG) rather than a look.
    minHeight: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  disabled: { opacity: 0.5 },
  label: { ...type.bodyMedium, textAlign: "center", flexShrink: 1 },
});

const VARIANT_STYLES: Record<NonNullable<Props["variant"]>, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
  danger: { backgroundColor: colors.error },
};

const TEXT_STYLES: Record<NonNullable<Props["variant"]>, { color: string }> = {
  primary: { color: colors.textInverse },
  secondary: { color: colors.textInverse },
  outline: { color: colors.primary },
  danger: { color: colors.textInverse },
};
