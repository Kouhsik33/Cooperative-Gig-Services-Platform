import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "./Card";
import Rating from "./Rating";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { icons, iconSize, type IconName } from "../../theme/icons";

interface Props {
  icon: IconName;
  name: string;
  category: string;
  priceLabel: string;
  /** Aggregate stars; null when nothing has been rated yet. */
  ratingAvg?: number | null;
  ratingCount?: number;
  completedCount?: number;
  durationLabel?: string | null;
  /** Rendered as an explicit "not available here yet" note, never as a hidden row. */
  unavailableLabel?: string | null;
  trustLabel?: string;
  onPress: () => void;
}

// A service reads as a product (master prompt §2 — "services should feel
// like products"): price, how long it takes, what other people thought,
// and the cooperative guarantee, all before the customer commits to
// opening it.
//
// Every one of those figures is server-aggregated from real bookings and
// ratings; a service with no history shows fewer facts rather than
// invented ones.
export default function ServiceCard({
  icon,
  name,
  category,
  priceLabel,
  ratingAvg,
  ratingCount,
  completedCount,
  durationLabel,
  unavailableLabel,
  trustLabel,
  onPress,
}: Props) {
  const hasProof = ratingAvg != null && (ratingCount ?? 0) > 0;
  return (
    <Card
      onPress={onPress}
      style={[styles.card, unavailableLabel ? styles.cardMuted : null]}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${priceLabel}.${hasProof ? ` ${ratingAvg} stars.` : ""}`}
    >
      <View style={styles.headRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={iconSize.lg} color={colors.primary} />
        </View>
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.category}>{category}</Text>
        </View>
      </View>

      {(hasProof || completedCount) ? (
        <View style={styles.proofRow}>
          {hasProof && <Rating value={ratingAvg!} count={ratingCount} />}
          {hasProof && !!completedCount && <Text style={styles.dot}>·</Text>}
          {!!completedCount && (
            <Text style={styles.completed}>{completedCount}+ completed</Text>
          )}
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={styles.price}>{priceLabel}</Text>
        {durationLabel ? <Text style={styles.duration}>· {durationLabel}</Text> : null}
      </View>

      {trustLabel ? (
        <View style={styles.trustRow}>
          <Ionicons name={icons.verified} size={iconSize.xs} color={colors.success} />
          <Text style={styles.trust}>{trustLabel}</Text>
        </View>
      ) : null}
      {unavailableLabel ? <Text style={styles.unavailable}>{unavailableLabel}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  cardMuted: { opacity: 0.72 },
  headRow: { flexDirection: "row", alignItems: "flex-start" },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  head: { flex: 1 },
  name: { ...type.h3, color: colors.textPrimary },
  category: { ...type.small, color: colors.textMuted, marginTop: 2, textTransform: "capitalize" },
  proofRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  dot: { ...type.small, color: colors.textMuted, marginHorizontal: spacing.xs },
  completed: { ...type.small, color: colors.textSecondary },
  metaRow: { flexDirection: "row", alignItems: "baseline", marginTop: spacing.sm, flexWrap: "wrap" },
  price: { ...type.bodyMedium, color: colors.primaryDark },
  duration: { ...type.small, color: colors.textSecondary, marginLeft: spacing.xs },
  trustRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  trust: { ...type.caption, color: colors.success },
  unavailable: { ...type.caption, color: colors.warning, marginTop: spacing.sm },
});
