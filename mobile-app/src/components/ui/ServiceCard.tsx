import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "./Card";
import Rating from "./Rating";
import { borders, colors, radius, shadow, spacing, type } from "../../theme/tokens";
import { icons, iconSize, type IconName } from "../../theme/icons";

interface Props {
  icon: IconName;
  name: string;
  category: string;
  priceLabel: string;
  ratingAvg?: number | null;
  ratingCount?: number;
  completedCount?: number;
  durationLabel?: string | null;
  unavailableLabel?: string | null;
  trustLabel?: string;
  onPress: () => void;
}

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
          <Ionicons name={icon} size={iconSize.md} color={colors.textPrimary} />
        </View>
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <View style={styles.categoryPill}>
            <Text style={styles.category}>{category}</Text>
          </View>
        </View>
      </View>

      {(hasProof || completedCount) ? (
        <View style={styles.proofRow}>
          {hasProof && (
            <View style={styles.starBadge}>
              <Rating value={ratingAvg!} count={ratingCount} size={12} />
            </View>
          )}
          {!!completedCount && (
            <Text style={styles.completed}>• {completedCount}+ bookings</Text>
          )}
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.pricePill}>
          <Text style={styles.price}>{priceLabel}</Text>
          {durationLabel ? <Text style={styles.duration}>({durationLabel})</Text> : null}
        </View>
        <View style={styles.arrowButton}>
          <Ionicons name="arrow-forward" size={16} color={colors.primaryForeground} />
        </View>
      </View>

      {trustLabel ? (
        <View style={styles.trustRow}>
          <Ionicons name={icons.verified} size={iconSize.xs} color={colors.textPrimary} />
          <Text style={styles.trust}>{trustLabel}</Text>
        </View>
      ) : null}
      {unavailableLabel ? <Text style={styles.unavailable}>{unavailableLabel}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardMuted: { opacity: 0.72 },
  headRow: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: borders.default,
    borderColor: borders.color,
    backgroundColor: colors.skyLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  head: { flex: 1 },
  name: { ...type.h3, fontWeight: "800", color: colors.textPrimary },
  categoryPill: {
    alignSelf: "flex-start",
    marginTop: 3,
  },
  category: {
    ...type.caption,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  proofRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  starBadge: {
    backgroundColor: colors.goldLight,
    borderWidth: borders.thin,
    borderColor: borders.color,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  completed: { ...type.caption, fontWeight: "600", color: colors.textSecondary },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  pricePill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  price: { ...type.bodyMedium, fontWeight: "800", color: colors.textPrimary },
  duration: { ...type.caption, color: colors.textSecondary },
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: borders.thin,
    borderColor: borders.color,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: borders.color,
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.skyLight,
    borderWidth: borders.thin,
    borderColor: borders.color,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  trust: { ...type.caption, fontWeight: "700", color: colors.textPrimary },
  unavailable: { ...type.caption, fontWeight: "700", color: colors.warning, marginTop: spacing.sm },
});
