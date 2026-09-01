import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { icons, iconSize, type IconName } from "../../theme/icons";

// Cooperative trust signals (master prompt §4). Deliberately restrained:
// the brief says use trust signals "where they reduce uncertainty" and
// explicitly warns against overdoing badges, so this renders as quiet
// supporting text rather than a loud pill — the claim carries the weight,
// not the decoration.

export type TrustTone = "verified" | "welfare" | "fairWage" | "neutral";

const TONES: Record<TrustTone, { icon: IconName; fg: string; bg: string }> = {
  verified: { icon: icons.verified, fg: colors.success, bg: colors.successLight },
  welfare: { icon: icons.welfare, fg: colors.primaryDark, bg: colors.primaryLight },
  fairWage: { icon: icons.fairWage, fg: colors.primaryDark, bg: colors.primaryLight },
  neutral: { icon: "ellipse", fg: colors.textSecondary, bg: colors.background },
};

export default function TrustBadge({
  label,
  tone = "verified",
  compact = false,
}: {
  label: string;
  tone?: TrustTone;
  compact?: boolean;
}) {
  const t = TONES[tone];
  return (
    <View
      style={[styles.wrap, { backgroundColor: t.bg }, compact && styles.compact]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Ionicons name={t.icon} size={iconSize.xs} color={t.fg} style={styles.icon} />
      <Text style={[styles.label, { color: t.fg }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** A stacked set of trust claims, for service detail / checkout. */
export function TrustList({ items }: { items: { label: string; tone?: TrustTone }[] }) {
  return (
    <View style={styles.list}>
      {items.map((i) => (
        <View key={i.label} style={styles.listRow}>
          <Ionicons
            name={TONES[i.tone ?? "verified"].icon}
            size={iconSize.sm}
            color={TONES[i.tone ?? "verified"].fg}
            style={styles.icon}
          />
          <Text style={styles.listLabel}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    // Wrapping matters here: Hindi and Marathi renderings of these claims
    // run roughly 1.4x the English width.
    maxWidth: "100%",
  },
  compact: { paddingVertical: 2 },
  icon: { marginRight: spacing.xs, marginTop: 1 },
  label: { ...type.caption, flexShrink: 1 },
  list: { marginTop: spacing.xs },
  listRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
  listLabel: { ...type.small, color: colors.textSecondary, flex: 1 },
});
