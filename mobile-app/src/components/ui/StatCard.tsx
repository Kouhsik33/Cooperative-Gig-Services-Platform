import { StyleSheet, Text, View } from "react-native";
import { borders, colors, radius, shadow, spacing, type } from "../../theme/tokens";

interface Props {
  label: string;
  value: string;
  tone?: "default" | "highlight" | "lime" | "yellow" | "coral" | "cyan" | "purple" | "peach";
}

export default function StatCard({ label, value, tone = "default" }: Props) {
  const bgStyle = TONE_STYLES[tone] || styles.cardDefault;
  return (
    <View style={[styles.card, bgStyle, shadow.sm]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: borders.default,
    borderColor: borders.color,
    padding: spacing.lg,
  },
  cardDefault: {
    backgroundColor: colors.surface,
  },
  label: {
    ...type.small,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  value: {
    ...type.h2,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
});

const TONE_STYLES: Record<NonNullable<Props["tone"]>, { backgroundColor: string }> = {
  default: { backgroundColor: colors.surface },
  highlight: { backgroundColor: colors.lime },
  lime: { backgroundColor: colors.lime },
  yellow: { backgroundColor: colors.yellow },
  coral: { backgroundColor: colors.primaryLight },
  cyan: { backgroundColor: colors.cyanLight },
  purple: { backgroundColor: colors.purpleLight },
  peach: { backgroundColor: colors.peachLight },
};
