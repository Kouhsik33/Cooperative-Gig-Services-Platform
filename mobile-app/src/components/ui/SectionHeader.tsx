import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../../theme/tokens";

interface Props {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function SectionHeader({ title, subtitle, action }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  textCol: { flexShrink: 1 },
  title: { ...type.h3, color: colors.textPrimary },
  subtitle: { ...type.small, color: colors.textSecondary, marginTop: 2 },
});
