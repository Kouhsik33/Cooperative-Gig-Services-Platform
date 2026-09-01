import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

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
      <Ionicons name={icons.star} size={size} color={colors.gold} style={styles.star} />
      <Text style={[styles.value, { fontSize: size }]}>{value.toFixed(1)}</Text>
      {count !== undefined && (
        <Text style={[styles.count, { fontSize: size - 1 }]}> ({count})</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  star: { marginRight: spacing.xs / 2 },
  value: { ...type.smallMedium, color: colors.textPrimary },
  count: { color: colors.textMuted },
});
