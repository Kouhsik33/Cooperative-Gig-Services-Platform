import { useCallback, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useBookingSync } from "../../lib/useBookingSync";
import type { BookingsStackParamList } from "../../navigation/CustomerNavigator";
import { useTabSwitch } from "../../navigation/TabSwitchContext";
import { listMyBookings } from "../../api/bookings";
import type { Booking, BookingStatus } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { Button, Card, Chip, EmptyState, ErrorState, SkeletonList, StatusBadge } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";
import { icons } from "../../theme/icons";

type Props = NativeStackScreenProps<BookingsStackParamList, "BookingsList">;

const SEGMENTS = ["active", "upcoming", "completed", "cancelled"] as const;
type Segment = (typeof SEGMENTS)[number];

// Split by whether anything is happening *right now*: a booking still
// searching, or one whose professional is en route / working, needs the
// customer's attention today; a merely scheduled one does not.
const ACTIVE_STATUSES: BookingStatus[] = [
  "REQUESTED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
];
const UPCOMING_STATUSES: BookingStatus[] = ["ACCEPTED", "ASSIGNED"];

// Customer Bookings tab (master prompt §18/§19) — segmented by status,
// using the same listMyBookings() the worker's Earnings/JobFeed screens
// already call. "Rate" surfaces RatingScreen, which nothing in the app
// previously linked to — Requirement 6 needs a real tappable entry point.
export default function BookingsListScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const switchTab = useTabSwitch();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [segment, setSegment] = useState<Segment>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBookings(await listMyBookings());
      setError(null);
    } catch {
      setError(t("bookings.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Reload on focus + on every booking lifecycle socket event, so a
  // booking cancelled/completed/advanced elsewhere is reflected here.
  useBookingSync(load);

  if (loading) return <SkeletonList count={4} variant="row" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const filtered = bookings.filter((b) =>
    segment === "active"
      ? ACTIVE_STATUSES.includes(b.status)
      : segment === "upcoming"
      ? UPCOMING_STATUSES.includes(b.status)
      : segment === "completed"
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
          <Text style={styles.title}>{t("bookings.title")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentRow}
            style={styles.segmentScroll}
          >
            {SEGMENTS.map((s) => (
              <Chip key={s} label={t(`bookings.${s}`)} selected={s === segment} onPress={() => setSegment(s)} />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={icons.invoice}
          title={t(`bookings.empty${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)}
          body={t("bookings.emptyBody")}
          actionLabel={t("common.bookingsEmptyCta")}
          onAction={() => switchTab("home")}
        />
      }
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.service}>{item.service.name}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.meta}>{item.worker ? item.worker.user.name : t("bookings.findingProfessional")}</Text>
          <Text style={styles.meta}>{formatDateTime(item.scheduledAt, i18n.language)}</Text>
          <Text style={styles.amount}>{formatCurrency(item.totalAmount, i18n.language)}</Text>
          <View style={styles.actions}>
            {item.status === "COMPLETED" ? (
              <TouchableOpacity
                onPress={() => navigation.navigate("Invoice", { bookingId: item.id })}
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.link}>{t("bookings.viewInvoice")}</Text>
              </TouchableOpacity>
            ) : item.status === "CANCELLED" || item.status === "REJECTED" || item.status === "EXPIRED" ? (
              <View />
            ) : (
              <TouchableOpacity
                onPress={() => navigation.navigate("BookingTracking", { bookingId: item.id })}
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.link}>{t("bookings.trackBooking")}</Text>
              </TouchableOpacity>
            )}
            {item.status === "COMPLETED" && (
              <View style={styles.completedActions}>
                <Button
                  label={t("bookings.bookAgain")}
                  onPress={() =>
                    navigation.navigate("ServiceDetail", {
                      serviceId: item.service.id,
                      serviceName: item.service.name,
                    })
                  }
                  style={styles.rateButton}
                />
                {!item.rating && (
                  <Button
                    label={t("bookings.rate")}
                    variant="outline"
                    onPress={() => navigation.navigate("Rating", { bookingId: item.id })}
                    style={styles.rateButton}
                  />
                )}
              </View>
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
  segmentScroll: {
    marginHorizontal: -spacing.xl,
    marginBottom: spacing.lg,
  },
  segmentRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingRight: spacing.xl + spacing.md,
  },
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
  completedActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
});
