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

export default function Card({
  children,
  onPress,
  style,
  elevated = true,
  accessibilityRole,
  accessibilityLabel,
}: Props) {
  const content = (
    <View style={[styles.card, elevated && shadow.sm, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
    >
      {content}
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
});
