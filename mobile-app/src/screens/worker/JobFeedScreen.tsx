import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../../navigation/WorkerNavigator";
import { acceptBooking, listIncomingRequests, listMyBookings } from "../../api/bookings";
import type { IncomingRequest } from "../../api/bookings";
import type { Booking, BookingStatus } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { getSocket } from "../../lib/socket";
import { Avatar, Badge, Button, Card, EmptyState, LoadingState, StatusBadge } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<JobsStackParamList, "JobFeed">;

// Assigned-or-later — the dispatch model (§8-16) means REQUESTED/
// unassigned bookings are never "this worker's job" until they win the
// accept race, so they don't belong in this list at all; they're the
// separate "New requests" section above it instead.
const MY_JOB_STATUSES: BookingStatus[] = [
  "ASSIGNED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
];

// Worker Jobs tab (Part B) — Requirements 4, 8; rebuilt around the
// dispatch model (§13-16, §24). Two sections: "New requests" — broadcast
// jobs this worker is eligible for, Accept/Decline, deliberately thin on
// customer detail until accepted — and "My jobs" — bookings already won,
// which drill into JobDetailScreen for the full lifecycle. Live-updated
// via Socket.io: booking:dispatchRequest (a new request came in),
// booking:noLongerAvailable (someone else won it), booking:statusUpdate
// (one of my own jobs moved forward).
export default function JobFeedScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [myJobs, setMyJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loadIncoming = useCallback(async () => {
    const requests = await listIncomingRequests();
    setIncoming(requests);
  }, []);

  const loadMyJobs = useCallback(async () => {
    const bookings = await listMyBookings();
    setMyJobs(bookings.filter((b) => MY_JOB_STATUSES.includes(b.status)));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadIncoming(), loadMyJobs()]);
    } finally {
      setLoading(false);
    }
  }, [loadIncoming, loadMyJobs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onNoLongerAvailable(payload: { id: string }) {
      setIncoming((prev) => prev.filter((r) => r.id !== payload.id));
    }

    socket.on("booking:dispatchRequest", loadIncoming);
    socket.on("booking:noLongerAvailable", onNoLongerAvailable);
    socket.on("booking:statusUpdate", loadMyJobs);

    return () => {
      socket.off("booking:dispatchRequest", loadIncoming);
      socket.off("booking:noLongerAvailable", onNoLongerAvailable);
      socket.off("booking:statusUpdate", loadMyJobs);
    };
  }, [loadIncoming, loadMyJobs]);

  async function accept(id: string) {
    setAcceptingId(id);
    try {
      await acceptBooking(id);
      setIncoming((prev) => prev.filter((r) => r.id !== id));
      await loadMyJobs();
      navigation.navigate("JobDetail", { bookingId: id });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        Alert.alert("Request unavailable", "Another professional accepted this service.");
        setIncoming((prev) => prev.filter((r) => r.id !== id));
      } else {
        Alert.alert("Could not accept this job. Please try again.");
      }
    } finally {
      setAcceptingId(null);
    }
  }

  function decline(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  if (loading) return <LoadingState />;

  const visibleIncoming = incoming.filter((r) => !dismissed.has(r.id));

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={myJobs}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>{t("worker.jobFeedTitle")}</Text>

          <Text style={styles.sectionTitle}>New requests</Text>
          {visibleIncoming.length === 0 ? (
            <Text style={styles.emptyIncoming}>No new requests right now.</Text>
          ) : (
            visibleIncoming.map((req) => (
              <Card key={req.id} style={[styles.requestCard, req.isEmergency && styles.cardEmergency]}>
                {req.isEmergency && <Badge label="🚨 EMERGENCY" tone="error" />}
                <Text style={styles.serviceName}>{req.serviceName}</Text>
                <Text style={styles.meta}>
                  {req.distanceKm != null ? `${req.distanceKm} km away · ` : ""}
                  {formatDateTime(req.scheduledAt, i18n.language)}
                </Text>
                <Text style={styles.earning}>
                  {t("worker.youEarn")}: {formatCurrency(req.workerShare, i18n.language)}
                  {req.isEmergency
                    ? ` (${t("worker.emergencyBonusIncluded")}: ${formatCurrency(req.emergencyBonus, i18n.language)})`
                    : ""}
                </Text>
                <View style={styles.requestActions}>
                  <TouchableOpacity onPress={() => decline(req.id)} style={styles.declineButton}>
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                  <Button
                    label="Accept"
                    onPress={() => accept(req.id)}
                    loading={acceptingId === req.id}
                    disabled={acceptingId !== null}
                    style={styles.acceptButton}
                  />
                </View>
              </Card>
            ))
          )}

          <Text style={styles.sectionTitle}>My jobs</Text>
          {myJobs.length === 0 && <EmptyState icon="📭" title={t("worker.noJobs")} />}
        </View>
      }
      renderItem={({ item }) => (
        <Card
          style={[styles.card, item.isEmergency && styles.cardEmergency]}
          onPress={() => navigation.navigate("JobDetail", { bookingId: item.id })}
        >
          <View style={styles.cardHeader}>
            <Avatar name={item.service.name} size={36} />
            <View style={styles.cardHeaderText}>
              <Text style={styles.serviceName}>
                {item.service.name}
                {item.isEmergency && <Text style={styles.emergencyTag}> 🚨</Text>}
              </Text>
              <Text style={styles.meta}>
                {formatDateTime(item.scheduledAt, i18n.language)}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.earning}>
            {t("worker.youEarn")}: {formatCurrency(item.workerShare, i18n.language)}
            {item.isEmergency
              ? ` (${t("worker.emergencyBonusIncluded")}: ${formatCurrency(
                  item.emergencyBonus,
                  i18n.language
                )})`
              : ""}
          </Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  sectionTitle: { ...type.h3, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.md },
  emptyIncoming: { ...type.small, color: colors.textMuted, marginBottom: spacing.lg },
  requestCard: {
    marginBottom: spacing.md,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  requestActions: { flexDirection: "row", marginTop: spacing.md, gap: spacing.md },
  declineButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  declineText: { ...type.smallMedium, color: colors.textSecondary },
  acceptButton: { flex: 1 },
  card: { marginBottom: spacing.md },
  cardEmergency: { borderColor: colors.error, borderWidth: 1.5 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  cardHeaderText: { marginLeft: spacing.md, flex: 1 },
  emergencyTag: { color: colors.error },
  serviceName: { ...type.h3, color: colors.textPrimary },
  meta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  earning: { ...type.bodyMedium, color: colors.success, marginTop: spacing.md },
});
