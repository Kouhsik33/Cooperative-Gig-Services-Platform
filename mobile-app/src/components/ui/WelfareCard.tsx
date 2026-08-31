import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type } from "../../theme/tokens";

interface Props {
  label: string;
  amount: string;
  tone?: "primary" | "secondary";
}

// Signature "My Welfare" summary tile (master prompt §25). Deliberately
// distinct from a plain StatCard — welfare balances get the primary
// brand fill, not just an outlined neutral card.
export default function WelfareCard({ label, amount, tone = "primary" }: Props) {
  const bg = tone === "primary" ? colors.primary : colors.primaryDark;
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.amount}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  label: { ...type.small, color: colors.primaryLight },
  amount: { ...type.display, color: colors.textInverse, marginTop: spacing.xs },
});
