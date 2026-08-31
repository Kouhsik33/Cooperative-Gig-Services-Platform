import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, type } from "../../theme/tokens";
import type { BookingStatus } from "../../api/types";

interface BadgeProps {
  label: string;
  tone?: "success" | "warning" | "error" | "info" | "neutral";
}

const TONE_STYLES: Record<
  NonNullable<BadgeProps["tone"]>,
  { bg: string; fg: string }
> = {
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warning },
  error: { bg: colors.errorLight, fg: colors.error },
  info: { bg: colors.infoLight, fg: colors.info },
  neutral: { bg: colors.primaryLight, fg: colors.textSecondary },
};

export function Badge({ label, tone = "neutral" }: BadgeProps) {
  const t = TONE_STYLES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const STATUS_TONE: Record<BookingStatus, BadgeProps["tone"]> = {
  REQUESTED: "neutral",
  ACCEPTED: "info",
  ASSIGNED: "info",
  ON_THE_WAY: "info",
  ARRIVED: "warning",
  IN_PROGRESS: "warning",
  COMPLETION_PENDING: "warning",
  COMPLETED: "success",
  CANCELLED: "error",
  REJECTED: "error",
  EXPIRED: "error",
};

export function StatusBadge({ status }: { status: BookingStatus | string }) {
  const tone = STATUS_TONE[status as BookingStatus] ?? "neutral";
  return <Badge label={status.replace(/_/g, " ")} tone={tone} />;
}

export function VerifiedBadge({ label }: { label: string }) {
  return (
    <View style={styles.verifiedRow}>
      <Text style={styles.verifiedCheck}>✓</Text>
      <Text style={styles.verifiedLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  label: { ...type.caption, textTransform: "capitalize" },
  verifiedRow: { flexDirection: "row", alignItems: "center" },
  verifiedCheck: {
    color: colors.success,
    fontWeight: "800",
    marginRight: spacing.xs / 2,
  },
  verifiedLabel: { ...type.smallMedium, color: colors.success },
});
