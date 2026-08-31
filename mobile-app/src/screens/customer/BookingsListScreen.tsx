import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BookingsStackParamList } from "../../navigation/CustomerNavigator";
import { listMyBookings } from "../../api/bookings";
import type { Booking, BookingStatus } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, StatusBadge } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<BookingsStackParamList, "BookingsList">;

const SEGMENTS = ["Upcoming", "Completed", "Cancelled"] as const;
type Segment = (typeof SEGMENTS)[number];

const UPCOMING_STATUSES: BookingStatus[] = [
  "REQUESTED",
  "ACCEPTED",
  "ASSIGNED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
];

// Customer Bookings tab (master prompt §18/§19) — segmented by status,
// using the same listMyBookings() the worker's Earnings/JobFeed screens
// already call. "Rate" surfaces RatingScreen, which nothing in the app
// previously linked to — Requirement 6 needs a real tappable entry point.
export default function BookingsListScreen({ navigation }: Props) {
  const { i18n } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [segment, setSegment] = useState<Segment>("Upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(await listMyBookings());
      setError(null);
    } catch {
      setError("We couldn't load your bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const filtered = bookings.filter((b) =>
    segment === "Upcoming"
      ? UPCOMING_STATUSES.includes(b.status)
      : segment === "Completed"
      ? b.status === "COMPLETED"
      : ["CANCELLED", "REJECTED", "EXPIRED"].includes(b.status)
  );

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={filtered}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>My Bookings</Text>
          <View style={styles.segmentRow}>
            {SEGMENTS.map((s) => (
              <Chip key={s} label={s} selected={s === segment} onPress={() => setSegment(s)} />
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="📋"
          title={`No ${segment.toLowerCase()} bookings`}
          body="Services you book will show up here."
        />
      }
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.service}>{item.service.name}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.meta}>{item.worker ? item.worker.user.name : "Finding a professional..."}</Text>
          <Text style={styles.meta}>{formatDateTime(item.scheduledAt, i18n.language)}</Text>
          <Text style={styles.amount}>{formatCurrency(item.totalAmount, i18n.language)}</Text>
          <View style={styles.actions}>
            {item.status === "COMPLETED" ? (
              <TouchableOpacity onPress={() => navigation.navigate("Invoice", { bookingId: item.id })}>
                <Text style={styles.link}>View invoice</Text>
              </TouchableOpacity>
            ) : item.status === "CANCELLED" || item.status === "REJECTED" || item.status === "EXPIRED" ? (
              <View />
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate("BookingTracking", { bookingId: item.id })}>
                <Text style={styles.link}>Track booking</Text>
              </TouchableOpacity>
            )}
            {item.status === "COMPLETED" && (
              <Button
                label="Rate"
                variant="outline"
                onPress={() => navigation.navigate("Rating", { bookingId: item.id })}
                style={styles.rateButton}
              />
            )}
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  segmentRow: { flexDirection: "row", marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  service: { ...type.h3, color: colors.textPrimary, flexShrink: 1, marginRight: spacing.sm },
  meta: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs },
  amount: { ...type.bodyMedium, color: colors.textPrimary, marginTop: spacing.sm },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  link: { ...type.smallMedium, color: colors.primary },
  rateButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
});
