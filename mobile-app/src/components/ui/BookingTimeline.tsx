import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../../theme/tokens";
import type { BookingStatus } from "../../api/types";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

// The booking lifecycle as one shared, connected timeline (master prompt
// §2 "Active booking"). Previously the customer and the worker each drew
// their own ad-hoc list of steps, which meant the two sides could describe
// the same booking differently. One component, one ordering, both sides.
//
// Rendered as a connected rail (dot + joining line) rather than a plain
// list, so "how far along is this" is readable at a glance instead of
// requiring the labels to be read in order.

export interface TimelineStep {
  key: string;
  label: string;
  /** Rendered under the label once reached — e.g. an actual timestamp. */
  detail?: string | null;
}

/** Canonical order. COMPLETION_PENDING collapses into "in progress" — it is
 *  a sub-state of the service still happening, not a step of its own. */
export const TIMELINE_ORDER: BookingStatus[] = [
  "REQUESTED",
  "ASSIGNED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
];

export function timelineIndexFor(status: BookingStatus): number {
  if (status === "COMPLETION_PENDING") return TIMELINE_ORDER.indexOf("IN_PROGRESS");
  if (status === "ACCEPTED") return TIMELINE_ORDER.indexOf("ASSIGNED");
  return TIMELINE_ORDER.indexOf(status);
}

interface Props {
  steps: TimelineStep[];
  /** Index of the furthest step reached; steps at or below it read as done. */
  currentIndex: number;
}

export default function BookingTimeline({ steps, currentIndex }: Props) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: steps.length, now: Math.max(0, currentIndex + 1) }}
    >
      {steps.map((step, i) => {
        const done = i <= currentIndex;
        const current = i === currentIndex;
        const last = i === steps.length - 1;
        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
                {done && !current && (
                  <Ionicons name={icons.included} size={iconSize.xs} color={colors.primaryForeground} />
                )}
              </View>
              {/* The connector belongs to the step above it, so the last
                  step doesn't trail a line into empty space. */}
              {!last && <View style={[styles.connector, i < currentIndex && styles.connectorDone]} />}
            </View>
            <View style={styles.body}>
              <Text style={[styles.label, done && styles.labelDone, current && styles.labelCurrent]}>
                {step.label}
              </Text>
              {step.detail ? <Text style={styles.detail}>{step.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 22;

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  rail: { width: DOT, alignItems: "center" },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  // The active step is hollow with a heavy ring — it reads as "here",
  // distinct from both the filled ticks behind it and the empty ones ahead.
  dotCurrent: { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 4 },
  connector: { width: 2, flex: 1, minHeight: 22, backgroundColor: colors.border },
  connectorDone: { backgroundColor: colors.success },
  body: { flex: 1, paddingLeft: spacing.md, paddingBottom: spacing.lg },
  label: { ...type.body, color: colors.textMuted },
  labelDone: { color: colors.textPrimary },
  labelCurrent: { ...type.bodyMedium, color: colors.primaryDark },
  detail: { ...type.caption, color: colors.textMuted, marginTop: 2 },
});
