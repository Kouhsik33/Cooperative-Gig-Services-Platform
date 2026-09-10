import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { ServicePackage } from "../../api/types";
import { borders, colors, layout, radius, shadow, spacing, type } from "../../theme/tokens";

// Selectable task / problem item with a tick button.
//
// Designed as an accessible checkbox where the customer ticks the specific
// tasks they need (e.g. switchboard repair, socket fix) to dynamically
// compute the bill.
export default function ServicePackageCard({
  pkg,
  selected,
  onSelect,
  money,
  index,
  total,
}: {
  pkg: ServicePackage;
  selected: boolean;
  onSelect: () => void;
  money: (n: number) => string;
  index: number;
  total: number;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${pkg.name}. ${money(pkg.price)}. ${pkg.durationMinMinutes} to ${pkg.durationMaxMinutes} ${t("serviceDetail.minutes")}.`}
      accessibilityHint={`${index + 1} of ${total}`}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.head}>
        {/* Neobrutalist Tick Button / Checkbox */}
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected && <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />}
        </View>

        <View style={styles.headText}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, selected && styles.nameSelected]}>{pkg.name}</Text>
            {pkg.isDefault && (
              <View style={styles.recommended}>
                <Text style={styles.recommendedText}>{t("packages.recommended")}</Text>
              </View>
            )}
          </View>
          <Text style={styles.description}>{pkg.description}</Text>
        </View>

        <View style={styles.priceCol}>
          <Text style={[styles.price, selected && styles.priceSelected]}>
            {money(pkg.price)}
          </Text>
          <Text style={styles.duration}>
            {pkg.durationMinMinutes}–{pkg.durationMaxMinutes} {t("serviceDetail.minutes")}
          </Text>
        </View>
      </View>

      {/* Task inclusions */}
      {pkg.inclusions.length > 0 && (
        <View style={[styles.inclusions, selected && styles.inclusionsSelected]}>
          {pkg.inclusions.map((inc) => (
            <View key={inc} style={styles.inclusionRow}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={selected ? colors.primary : colors.success}
              />
              <Text style={[styles.inclusionText, selected && styles.inclusionTextSelected]}>
                {inc}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: borders.default,
    borderColor: borders.color,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: layout.minTouchTarget,
    ...shadow.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: borders.thick,
    backgroundColor: colors.primaryLight,
  },
  cardPressed: {
    opacity: 0.85,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: borders.default,
    borderColor: borders.color,
    marginRight: spacing.md,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  checkboxOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  headText: {
    flex: 1,
    marginRight: spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  name: {
    ...type.bodyMedium,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  nameSelected: {
    color: colors.primary,
  },
  recommended: {
    backgroundColor: colors.skyLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: borders.thin,
    borderColor: borders.color,
  },
  recommendedText: {
    ...type.caption,
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 10,
  },
  description: {
    ...type.small,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  priceCol: {
    alignItems: "flex-end",
  },
  price: {
    ...type.h3,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  priceSelected: {
    color: colors.primary,
  },
  duration: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inclusions: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(43, 45, 66, 0.08)",
  },
  inclusionsSelected: {
    borderTopColor: "rgba(239, 35, 60, 0.2)",
  },
  inclusionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  inclusionText: {
    ...type.small,
    fontWeight: "500",
    color: colors.textSecondary,
    flex: 1,
  },
  inclusionTextSelected: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
