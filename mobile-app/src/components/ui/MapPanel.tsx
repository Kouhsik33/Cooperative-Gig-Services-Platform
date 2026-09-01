import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { icons, iconSize } from "../../theme/icons";

// The map surface, as one component for both sides of a booking.
//
// There is no map provider wired into this build, and the app has no live
// worker position stream — only lifecycle status transitions. So this
// deliberately does NOT draw a fake route or a moving pin: showing
// invented movement would be the single most misleading thing this
// product could do, because a customer would rely on it to decide when to
// come to the door.
//
// Instead it renders the two endpoints it genuinely knows and states its
// own limitation. The props are already shaped the way a real provider
// needs (two coordinates plus a status), so dropping in react-native-maps
// or Mapbox later is a change to this file alone.

export interface MapPoint {
  latitude: number;
  longitude: number;
  label: string;
}

interface Props {
  origin?: MapPoint | null;
  destination: MapPoint;
  /** Free-text state line, e.g. "On the way" — drives the header, not a pin. */
  statusLabel: string;
  /** Set once real GPS exists; until then the panel says so explicitly. */
  isLive?: boolean;
  liveUnavailableLabel: string;
}

export default function MapPanel({
  origin,
  destination,
  statusLabel,
  isLive = false,
  liveUnavailableLabel,
}: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={statusLabel}>
      <View style={styles.header}>
        <Text style={styles.status}>{statusLabel}</Text>
        {!isLive && <Text style={styles.badge}>{liveUnavailableLabel}</Text>}
      </View>

      <View style={styles.canvas}>
        {/* A schematic of the journey, not a map: two endpoints and the
            connection between them, at a fidelity the data supports. */}
        {origin && (
          <View style={styles.node}>
            <View style={[styles.pin, styles.pinOrigin]}>
              <Ionicons name={icons.worker} size={iconSize.md} color={colors.primary} />
            </View>
            <Text style={styles.nodeLabel} numberOfLines={1}>
              {origin.label}
            </Text>
          </View>
        )}
        {origin && <View style={styles.link} />}
        <View style={styles.node}>
          <View style={[styles.pin, styles.pinDest]}>
            <Ionicons name={icons.locationFilled} size={iconSize.md} color={colors.secondary} />
          </View>
          <Text style={styles.nodeLabel} numberOfLines={1}>
            {destination.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  status: { ...type.bodyMedium, color: colors.primaryDark, flex: 1 },
  badge: { ...type.caption, color: colors.textSecondary, flexShrink: 1, textAlign: "right" },
  canvas: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  node: { alignItems: "center", flex: 1 },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  pinOrigin: { backgroundColor: colors.surface, borderColor: colors.primary },
  pinDest: { backgroundColor: colors.surface, borderColor: colors.secondary },
  nodeLabel: { ...type.caption, color: colors.primaryDark, marginTop: spacing.xs, textAlign: "center" },
  link: {
    height: 2,
    flex: 1,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
});
