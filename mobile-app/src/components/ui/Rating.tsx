import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../../theme/tokens";

interface Props {
  value: number;
  count?: number;
  size?: number;
}

// Read-only star rating used on cards/profiles. For the interactive
// tap-to-rate control, RatingScreen keeps its own touchable stars.
export default function Rating({ value, count, size = 13 }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.star, { fontSize: size }]}>★</Text>
      <Text style={[styles.value, { fontSize: size }]}>{value.toFixed(1)}</Text>
      {count !== undefined && (
        <Text style={[styles.count, { fontSize: size - 1 }]}> ({count})</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  star: { color: colors.gold, marginRight: spacing.xs / 2 },
  value: { ...type.smallMedium, color: colors.textPrimary },
  count: { color: colors.textMuted },
});
