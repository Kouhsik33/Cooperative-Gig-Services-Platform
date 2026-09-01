import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { ServicePackage } from "../../api/types";
import { colors, layout, radius, spacing, type } from "../../theme/tokens";

// One selectable service tier.
//
// Implemented as a real radio group rather than styled buttons: each card
// carries accessibilityRole="radio" with its selected state, so a screen
// reader announces "Standard, selected, 2 of 3" instead of reading three
// unrelated blocks of text. Pressable (not TouchableOpacity) per the
// react-native guidance, with a pressed style that changes colour only —
// never layout — so selecting a tier cannot make the list jump.
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
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${pkg.name}. ${money(pkg.price)}. ${pkg.durationMinMinutes} to ${pkg.durationMaxMinutes} ${t("serviceDetail.minutes")}.`}
      accessibilityHint={`${index + 1} of ${total}`}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected && <View style={styles.radioDot} />}
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
          <Text style={[styles.price, selected && styles.priceSelected]}>{money(pkg.price)}</Text>
          <Text style={styles.duration}>
            {pkg.durationMinMinutes}–{pkg.durationMaxMinutes} {t("serviceDetail.minutes")}
          </Text>
        </View>
      </View>

      {/* Inclusions only for the chosen tier — showing every list at once
          turns the comparison into a wall of text. */}
      {selected && pkg.inclusions.length > 0 && (
        <View style={styles.inclusions}>
          {pkg.inclusions.map((inc) => (
            <View key={inc} style={styles.inclusionRow}>
              <Ionicons name="checkmark" size={14} color={colors.success} />
              <Text style={styles.inclusionText}>{inc}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  // Selection is carried by border weight and tint, not by size, so the
  // surrounding layout never shifts when the choice changes.
  cardSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryLight },
  cardPressed: { backgroundColor: colors.background },
  head: { flexDirection: "row", alignItems: "flex-start" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    marginRight: spacing.md,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  headText: { flex: 1, marginRight: spacing.md },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  name: { ...type.bodyMedium, color: colors.textPrimary },
  nameSelected: { color: colors.primaryDark },
  recommended: {
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  recommendedText: { ...type.caption, color: colors.secondaryDark, fontWeight: "700" },
  description: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  priceCol: { alignItems: "flex-end" },
  price: { ...type.h3, color: colors.textPrimary },
  priceSelected: { color: colors.primaryDark },
  duration: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  inclusions: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inclusionRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs, gap: spacing.sm },
  inclusionText: { ...type.small, color: colors.textSecondary, flex: 1 },
});
