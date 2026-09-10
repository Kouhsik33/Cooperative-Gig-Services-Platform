import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { borders, colors, layout, radius, shadow, spacing, type } from "../../theme/tokens";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "lime" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        VARIANT_STYLES[variant],
        shadow.sm,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isDisabled}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.ink : colors.textPrimary} />
      ) : (
        <Text
          style={[styles.label, TEXT_STYLES[variant]]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: borders.default,
    borderColor: borders.color,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    minHeight: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  pressed: {
    transform: [{ translateX: 1.5 }, { translateY: 1.5 }],
    shadowOffset: { width: 1, height: 1 },
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    ...type.bodyMedium,
    fontWeight: "800",
    textAlign: "center",
    flexShrink: 1,
  },
});

const VARIANT_STYLES: Record<NonNullable<Props["variant"]>, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.skyLight },
  lime: { backgroundColor: colors.primaryLight },
  outline: { backgroundColor: colors.surface },
  danger: { backgroundColor: colors.error },
};

const TEXT_STYLES: Record<NonNullable<Props["variant"]>, TextStyle> = {
  primary: { color: colors.textInverse },
  secondary: { color: colors.textPrimary },
  lime: { color: colors.textPrimary },
  outline: { color: colors.textPrimary },
  danger: { color: colors.textInverse },
};
