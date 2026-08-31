import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Button from "./Button";
import { colors, spacing, type } from "../../theme/tokens";

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
  icon = "🗂️",
  title,
  body,
}: {
  icon?: string;
  title: string;
  body?: string;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {body && <Text style={styles.body}>{body}</Text>}
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
      <Text style={styles.icon}>⚠️</Text>
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
  icon: { fontSize: 40, marginBottom: spacing.md },
  title: { ...type.h3, color: colors.textPrimary, marginBottom: spacing.xs, textAlign: "center" },
  body: { ...type.body, color: colors.textSecondary, textAlign: "center" },
  retry: { marginTop: spacing.lg, minWidth: 160 },
});
