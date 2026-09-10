import { StyleSheet, Text, View } from "react-native";
import { borders, colors, radius, spacing, type } from "../../theme/tokens";
import type { BookingStatus } from "../../api/types";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

interface BadgeProps {
  label: string;
  tone?: "success" | "warning" | "error" | "info" | "neutral" | "lime" | "yellow" | "coral";
}

const TONE_STYLES: Record<
  NonNullable<BadgeProps["tone"]>,
  { bg: string; fg: string }
> = {
  success: { bg: colors.limeLight, fg: colors.textPrimary },
  warning: { bg: colors.yellowLight, fg: colors.textPrimary },
  error: { bg: colors.primaryLight, fg: colors.error },
  info: { bg: colors.cyanLight, fg: colors.textPrimary },
  neutral: { bg: colors.surface, fg: colors.textPrimary },
  lime: { bg: colors.lime, fg: colors.textPrimary },
  yellow: { bg: colors.yellow, fg: colors.textPrimary },
  coral: { bg: colors.primary, fg: colors.textInverse },
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
  REQUESTED: "yellow",
  ACCEPTED: "info",
  ASSIGNED: "info",
  ON_THE_WAY: "lime",
  ARRIVED: "lime",
  IN_PROGRESS: "lime",
  COMPLETION_PENDING: "yellow",
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
      <Ionicons name={icons.verified} size={iconSize.xs} color={colors.textPrimary} style={styles.verifiedCheck} />
      <Text style={styles.verifiedLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    borderWidth: borders.thin,
    borderColor: borders.color,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  label: {
    ...type.caption,
    fontWeight: "800",
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.limeLight,
    borderWidth: borders.thin,
    borderColor: borders.color,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  verifiedCheck: {
    marginRight: spacing.xs / 2,
  },
  verifiedLabel: {
    ...type.caption,
    fontWeight: "800",
    color: colors.textPrimary,
  },
});
