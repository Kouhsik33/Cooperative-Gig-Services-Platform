import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors, radius, spacing, type } from "../../theme/tokens";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

// Master prompt §14 — day/time picker chips and §2 skill chips share this
// one primitive so selected/unselected states look identical everywhere.
export default function Chip({ label, selected, onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.5 },
  label: { ...type.smallMedium, color: colors.textSecondary },
  labelSelected: { color: colors.textInverse },
});
