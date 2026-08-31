import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type } from "../../theme/tokens";

export default function CertificationBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>🎖️</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.infoLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  icon: { fontSize: 12, marginRight: spacing.xs },
  label: { ...type.caption, color: colors.info },
});
