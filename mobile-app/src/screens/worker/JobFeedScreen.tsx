import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobsStackParamList } from "../../navigation/WorkerNavigator";
import { acceptBooking, declineBooking, listIncomingRequests, listMyBookings } from "../../api/bookings";
import type { IncomingRequest } from "../../api/bookings";
import type { Booking, BookingStatus } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { getSocket } from "../../lib/socket";
import { Avatar, Card, EmptyState, ErrorState, RequestCard, SkeletonList, StatusBadge } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { icons, iconSize } from "../../theme/icons";
import { Ionicons } from "@expo/vector-icons";

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
  const [loadFailed, setLoadFailed] = useState(false);

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
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loadIncoming, loadMyJobs]);

  // Reload whenever the feed regains focus (e.g. back from JobDetail, or
  // switching tabs) — the socket handles live changes while it's open.
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

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
        Alert.alert(t("workerJob.requestGoneTitle"), "Another professional accepted this service.");
        setIncoming((prev) => prev.filter((r) => r.id !== id));
      } else {
        Alert.alert(t("workerJob.acceptError"));
      }
    } finally {
      setAcceptingId(null);
    }
  }

  async function decline(id: string) {
    // Optimistic removal, then persisted server-side so the request does
    // not reappear on the next load. Previously this was local-only.
    setDismissed((prev) => new Set(prev).add(id));
    try {
      await declineBooking(id);
    } catch {
      // Put it back rather than silently hiding a job the worker can still take.
      setDismissed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      Alert.alert(t("workerHome.declineFailed"));
    }
  }

  if (loading) return <SkeletonList count={4} variant="row" />;
  if (loadFailed) {
    return <ErrorState message={t("common.requestsLoadFailed")} onRetry={loadAll} retryLabel={t("common.retry")} />;
  }

  const visibleIncoming = incoming.filter((r) => !dismissed.has(r.id));

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={myJobs}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>{t("worker.jobFeedTitle")}</Text>

          <Text style={styles.sectionTitle}>{t("workerHome.newRequests")}</Text>
          {visibleIncoming.length === 0 ? (
            <Text style={styles.emptyIncoming}>{t("workerHome.noNewRequests")}</Text>
          ) : (
            visibleIncoming.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                accepting={acceptingId === req.id}
                disabled={acceptingId !== null}
                onAccept={() => accept(req.id)}
                onDecline={() => decline(req.id)}
              />
            ))
          )}

          <Text style={styles.sectionTitle}>My jobs</Text>
          {myJobs.length === 0 && (
            <EmptyState
              icon={icons.empty}
              title={t("worker.noJobs")}
              body={visibleIncoming.length > 0 ? t("workerHome.newRequests") : undefined}
            />
          )}
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
                {item.isEmergency && (
              <Ionicons name={icons.emergency} size={iconSize.sm} color={colors.error} style={styles.emergencyTag} />
            )}
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
  requestActions: { flexDirection: "row", marginTop: spacing.md, gap: spacing.md },
  card: { marginBottom: spacing.md },
  cardEmergency: { borderColor: colors.error, borderWidth: 1.5 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  cardHeaderText: { marginLeft: spacing.md, flex: 1 },
  emergencyTag: { marginLeft: spacing.xs },
  serviceName: { ...type.h3, color: colors.textPrimary },
  meta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  earning: { ...type.bodyMedium, color: colors.success, marginTop: spacing.md },
});
