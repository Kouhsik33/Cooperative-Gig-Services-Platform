import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

export default function CertificationBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Ionicons name="ribbon-outline" size={iconSize.sm} color={colors.secondaryDark} style={styles.icon} />
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
