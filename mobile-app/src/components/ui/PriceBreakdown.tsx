import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../../theme/tokens";

export interface PriceBreakdownLabels {
  totalPrice: string;
  workerShare: string;
  federationFee: string;
  welfareContribution: string;
  emergencyBonus: string;
  emergencyBonusNote: string;
}

interface Props {
  totalAmount: number;
  workerShare: number;
  federationFee: number;
  welfareContribution: number;
  emergencyBonus: number;
  isEmergency: boolean;
  money: (n: number) => string;
  labels: PriceBreakdownLabels;
  compact?: boolean;
}

// The single reusable wage-split itemization (master prompt §4/§15/§24) —
// used identically on FairPricingBreakdownScreen, InvoiceScreen, and
// EarningsScreen so customer and worker always see the same numbers.
// Purely presentational: every number here comes straight from the
// backend's Part F computation, nothing is recalculated client-side.
export default function PriceBreakdown({
  totalAmount,
  workerShare,
  federationFee,
  welfareContribution,
  emergencyBonus,
  isEmergency,
  money,
  labels,
  compact = false,
}: Props) {
  const workerSharePercent = totalAmount > 0 ? Math.round((workerShare / totalAmount) * 100) : 0;

  return (
    <View>
      <Row label={labels.totalPrice} value={money(totalAmount)} compact={compact} />
      <Row
        label={labels.workerShare}
        value={`${money(workerShare)} (${workerSharePercent}%)`}
        highlight
        compact={compact}
      />
      <Row label={labels.federationFee} value={money(federationFee)} compact={compact} />
      <Row
        label={labels.welfareContribution}
        value={money(welfareContribution)}
        compact={compact}
      />
      {isEmergency && (
        <View style={styles.emergencyBlock}>
          <Row
            label={labels.emergencyBonus}
            value={money(emergencyBonus)}
            highlight
            compact={compact}
            last
          />
          <Text style={styles.emergencyNote}>
            {labels.emergencyBonusNote}
          </Text>
        </View>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  highlight,
  compact,
  last,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  compact?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        compact && styles.rowCompact,
        last && styles.rowNoBorder,
      ]}
    >
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      <Text
        style={[
          styles.value,
          compact && styles.valueCompact,
          highlight && styles.valueHighlight,
        ]}
      >
        {value}
      </Text>
      {/* label flexes/wraps, value stays intact and right-aligned — a
          long (e.g. Telugu) label can no longer push the amount off
          screen. See styles.label / styles.value below. */}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowCompact: { paddingVertical: spacing.xs + 2 },
  rowNoBorder: { borderBottomWidth: 0 },
  label: { ...type.body, color: colors.textSecondary, flexShrink: 1 },
  labelCompact: { ...type.small, color: colors.textSecondary },
  value: { ...type.bodyMedium, color: colors.textPrimary, flexShrink: 0, textAlign: "right" },
  valueCompact: { ...type.smallMedium, color: colors.textPrimary },
  valueHighlight: { color: colors.success },
  emergencyBlock: {
    marginTop: spacing.sm,
    backgroundColor: colors.secondaryLight,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
  },
  emergencyNote: {
    ...type.small,
    color: colors.secondaryDark,
    fontWeight: "600",
    paddingBottom: spacing.sm,
  },
});
