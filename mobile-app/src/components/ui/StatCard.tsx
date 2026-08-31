import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type } from "../../theme/tokens";

interface Props {
  label: string;
  value: string;
  tone?: "default" | "highlight";
}

export default function StatCard({ label, value, tone = "default" }: Props) {
  return (
    <View style={[styles.card, tone === "highlight" && styles.cardHighlight]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone === "highlight" && styles.valueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardHighlight: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  label: { ...type.small, color: colors.textSecondary },
  value: { ...type.h2, color: colors.textPrimary, marginTop: spacing.xs },
  valueHighlight: { color: colors.primaryDark },
});
