import { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radius, spacing } from "../../theme/tokens";

// Loading skeletons (master prompt §6/§7 — "skeleton loading", "never
// leave users staring at blank screens"). A skeleton beats a spinner
// wherever the shape of the incoming content is already known, because it
// preserves layout and so avoids the jump when data lands.
//
// Driven by Animated with useNativeDriver, so the pulse runs on the UI
// thread and costs nothing on the JS thread while data is being fetched —
// the exact moment JS is busiest.

function usePulse() {
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

export function SkeletonBlock({
  height = 16,
  width,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = usePulse();
  return (
    <Animated.View
      // Decorative only — a screen reader should announce the eventual
      // content, never the placeholder standing in for it.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { height, width: width ?? "100%", opacity }, style]}
    />
  );
}

/** Card-shaped skeleton matching ServiceCard's footprint. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonBlock height={44} width={44} style={styles.icon} />
      <SkeletonBlock height={17} width="60%" />
      <SkeletonBlock height={13} width="35%" style={styles.gapSm} />
      <SkeletonBlock height={15} width="45%" style={styles.gapMd} />
    </View>
  );
}

/** Row-shaped skeleton for list screens (bookings, notifications, jobs). */
export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <SkeletonBlock height={40} width={40} style={styles.avatar} />
      <View style={styles.rowBody}>
        <SkeletonBlock height={15} width="55%" />
        <SkeletonBlock height={13} width="80%" style={styles.gapSm} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4, variant = "card" }: { count?: number; variant?: "card" | "row" }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) =>
        variant === "card" ? <SkeletonCard key={i} /> : <SkeletonRow key={i} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.skeleton, borderRadius: radius.sm },
  list: { padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  icon: { borderRadius: 12, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  avatar: { borderRadius: 20, marginRight: spacing.md },
  rowBody: { flex: 1 },
  gapSm: { marginTop: spacing.sm },
  gapMd: { marginTop: spacing.md },
});
