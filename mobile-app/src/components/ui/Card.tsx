import React from "react";
import {
  AccessibilityRole,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { borders, colors, radius, shadow, spacing } from "../../theme/tokens";

export type CardVariant =
  | "surface"
  | "lime"
  | "coral"
  | "yellow"
  | "cyan"
  | "purple"
  | "peach"
  | "stacked";

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  variant?: CardVariant;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}

const OUTER_LAYOUT_KEYS = [
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
] as const;

export default function Card({
  children,
  onPress,
  style,
  elevated = true,
  variant = "surface",
  accessibilityRole,
  accessibilityLabel,
}: Props) {
  const variantStyle = VARIANT_STYLES[variant] || styles.surface;

  const cardContent = (
    <View
      style={[
        styles.card,
        variantStyle,
        elevated && shadow.md,
        variant === "stacked" && styles.stackedFace,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) {
    if (variant === "stacked") {
      return (
        <View style={styles.stackedWrapper}>
          <View style={styles.stackedBacking} />
          {cardContent}
        </View>
      );
    }
    return cardContent;
  }

  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  for (const k of OUTER_LAYOUT_KEYS) {
    if (flat[k] !== undefined) outer[k] = flat[k];
  }

  if (variant === "stacked") {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole={accessibilityRole ?? "button"}
        accessibilityLabel={accessibilityLabel}
        style={[styles.stackedWrapper, outer]}
      >
        <View style={styles.stackedBacking} />
        <View
          style={[
            styles.card,
            styles.fill,
            variantStyle,
            styles.stackedFace,
            style,
          ]}
        >
          {children}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
      style={outer}
    >
      <View
        style={[
          styles.card,
          styles.fill,
          variantStyle,
          elevated && shadow.md,
          style,
        ]}
      >
        {children}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: borders.default,
    borderColor: borders.color,
    padding: spacing.lg,
  },
  surface: {
    backgroundColor: colors.surface,
  },
  fill: { flexGrow: 1 },

  // Stacked 3D card style (replica of Mystery Sandwich & Task List cards)
  stackedWrapper: {
    position: "relative",
    marginRight: 4,
    marginBottom: 4,
  },
  stackedBacking: {
    position: "absolute",
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: borders.color,
    borderRadius: radius.lg,
  },
  stackedFace: {
    backgroundColor: colors.surface,
  },
});

const VARIANT_STYLES: Record<CardVariant, ViewStyle> = {
  surface: { backgroundColor: colors.surface },
  lime: { backgroundColor: colors.lime },
  coral: { backgroundColor: colors.primaryLight },
  yellow: { backgroundColor: colors.yellowLight },
  cyan: { backgroundColor: colors.cyanLight },
  purple: { backgroundColor: colors.purpleLight },
  peach: { backgroundColor: colors.peachLight },
  stacked: { backgroundColor: colors.surface },
};
