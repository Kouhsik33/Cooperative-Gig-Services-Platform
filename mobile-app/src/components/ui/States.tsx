import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "./Button";
import { colors, spacing, type } from "../../theme/tokens";
import { icons, iconSize, type IconName } from "../../theme/icons";

// Master prompt §48 — every important list needs loading/empty/error
// states, and errors must read as human sentences, not "Error 500".

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function EmptyState({
  icon = icons.empty,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  /** Recovery path. Omit where the user genuinely has nothing to do here. */
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      {/* Decorative: the title already carries the meaning, so this is
          hidden from the accessibility tree rather than read out. */}
      <Ionicons
        name={icon}
        size={iconSize.hero}
        color={colors.textMuted}
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={styles.title}>{title}</Text>
      {body && <Text style={styles.body}>{body}</Text>}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} style={styles.retry} />
      )}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.center}>
      <Ionicons
        name={icons.error}
        size={iconSize.hero}
        color={colors.warning}
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={styles.body}>{message}</Text>
      {onRetry && (
        <Button label={retryLabel} onPress={onRetry} variant="outline" style={styles.retry} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  icon: { marginBottom: spacing.md },
  title: { ...type.h3, color: colors.textPrimary, marginBottom: spacing.xs, textAlign: "center" },
  body: { ...type.body, color: colors.textSecondary, textAlign: "center" },
  retry: { marginTop: spacing.lg, minWidth: 160 },
});
