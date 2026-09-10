import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { borders, colors, radius, shadow, spacing, type } from "../../theme/tokens";

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export default function Chip({ label, icon, selected, onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        selected && shadow.sm,
        disabled && styles.chipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.8}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.textInverse : colors.textPrimary}
          style={styles.icon}
        />
      ) : null}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borders.thin,
    borderColor: borders.color,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: borders.color,
    borderWidth: borders.default,
  },
  chipDisabled: { opacity: 0.5 },
  icon: { marginRight: 6 },
  label: { ...type.smallMedium, color: colors.textPrimary, textTransform: "capitalize" },
  labelSelected: { color: colors.textInverse },
});
