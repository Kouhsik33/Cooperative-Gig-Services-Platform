import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/WorkerNavigator";
import { useAuth } from "../../store/AuthContext";
import { useTabSwitch } from "../../navigation/TabSwitchContext";
import { acceptBooking, listIncomingRequests, listMyBookings } from "../../api/bookings";
import type { IncomingRequest } from "../../api/bookings";
import { getWorker, getWorkerWelfare, updateAvailability } from "../../api/workers";
import type { WorkerAvailability } from "../../api/workers";
import type { Booking, BookingStatus } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../lib/format";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { Badge, Button, Card, LoadingState, StatCard, VerifiedBadge } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<HomeStackParamList, "WorkerHome">;

const MY_JOB_STATUSES: BookingStatus[] = [
  "ASSIGNED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
];

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// Worker Home tab (master prompt §23, dispatch model update §20/§24) —
// greeting, an AVAILABLE/OFFLINE toggle (BUSY is server-only — see
// api/workers.ts), today's snapshot, and a preview of incoming broadcast
// requests with a "View all" handoff to the Jobs tab. Numbers computed
// client-side from listMyBookings()/getWorkerWelfare() — nothing
// fabricated, no separate "today" endpoint exists.
export default function WorkerHomeScreen({ navigation }: Props) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const switchTab = useTabSwitch();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [welfareToday, setWelfareToday] = useState(0);
  const [availability, setAvailability] = useState<WorkerAvailability>("AVAILABLE");
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, requests] = await Promise.all([listMyBookings(), listIncomingRequests()]);
      setBookings(all.filter((b) => MY_JOB_STATUSES.includes(b.status) || b.status === "COMPLETED"));
      setIncoming(requests);
      if (user?.worker?.id) {
        const [welfare, profile] = await Promise.all([
          getWorkerWelfare(user.worker.id),
          getWorker(user.worker.id),
        ]);
        setAvailability(profile.availability);
        setWelfareToday(
          welfare.transactions
            .filter((t) => t.type === "contribution" && isToday(t.createdAt))
            .reduce((sum, t) => sum + t.amount, 0)
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user?.worker?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;

  const todaysBookings = bookings.filter((b) => isToday(b.scheduledAt));
  const todaysEarnings = todaysBookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + b.workerShare, 0);
  const previewRequests = incoming.slice(0, 3);

  async function toggleAvailability() {
    if (!user?.worker?.id || availability === "BUSY") return;
    const next = availability === "AVAILABLE" ? "OFFLINE" : "AVAILABLE";
    setTogglingAvailability(true);
    try {
      const updated = await updateAvailability(user.worker.id, next);
      setAvailability(updated.availability);
    } finally {
      setTogglingAvailability(false);
    }
  }

  async function accept(id: string) {
    setAcceptingId(id);
    try {
      await acceptBooking(id);
      setIncoming((prev) => prev.filter((r) => r.id !== id));
      navigation.navigate("JobDetail", { bookingId: id });
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>Good day, {user?.name?.split(" ")[0] ?? "there"}</Text>
      <VerifiedBadge label="Verified Professional" />
      <View style={styles.switcher}>
        <LanguageSwitcher persist />
      </View>

      <Card style={styles.availabilityCard}>
        <View style={styles.availabilityRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.availabilityLabel}>
              {availability === "BUSY" ? "On a job" : availability === "AVAILABLE" ? "Online" : "Offline"}
            </Text>
            <Text style={styles.availabilitySub}>
              {availability === "BUSY"
                ? "You'll go back online automatically once this job is done."
                : "Only AVAILABLE workers receive new service requests."}
            </Text>
          </View>
          <Switch
            value={availability === "AVAILABLE"}
            onValueChange={toggleAvailability}
            disabled={availability === "BUSY" || togglingAvailability}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </Card>

      <View style={styles.statRow}>
        <StatCard label="Today's jobs" value={String(todaysBookings.length)} />
        <StatCard
          label="Today's earnings"
          value={formatCurrency(todaysEarnings, i18n.language)}
          tone="highlight"
        />
      </View>
      <View style={styles.statRow}>
        <StatCard label="Welfare contribution today" value={formatCurrency(welfareToday, i18n.language)} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>New requests</Text>
        <TouchableOpacity onPress={() => switchTab("jobs")}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {previewRequests.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No job requests right now.</Text>
        </Card>
      ) : (
        previewRequests.map((req) => (
          <Card key={req.id} style={[styles.jobCard, req.isEmergency && styles.jobCardEmergency]}>
            {req.isEmergency && <Badge label="🚨 EMERGENCY" tone="error" />}
            <Text style={styles.jobService}>{req.serviceName}</Text>
            <Text style={styles.jobMeta}>
              {req.distanceKm != null ? `${req.distanceKm} km · ` : ""}
              {formatDateTime(req.scheduledAt, i18n.language)}
            </Text>
            <Text style={styles.jobEarning}>
              {formatCurrency(req.workerShare, i18n.language)}
              {req.isEmergency ? ` (+${formatCurrency(req.emergencyBonus, i18n.language)} incentive)` : ""}
            </Text>
            <Button
              label="Accept"
              onPress={() => accept(req.id)}
              loading={acceptingId === req.id}
              disabled={acceptingId !== null}
              style={styles.acceptButton}
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  greeting: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.sm },
  switcher: { marginVertical: spacing.lg, alignItems: "flex-start" },
  availabilityCard: { marginBottom: spacing.lg },
  availabilityRow: { flexDirection: "row", alignItems: "center" },
  availabilityLabel: { ...type.bodyMedium, color: colors.textPrimary },
  availabilitySub: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  statRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...type.h3, color: colors.textPrimary },
  viewAll: { ...type.smallMedium, color: colors.primary },
  emptyText: { ...type.body, color: colors.textSecondary },
  jobCard: { marginBottom: spacing.md },
  jobCardEmergency: { borderColor: colors.error, borderWidth: 1.5 },
  jobService: { ...type.h3, color: colors.textPrimary },
  jobMeta: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs },
  jobEarning: { ...type.bodyMedium, color: colors.success, marginTop: spacing.sm },
  acceptButton: { marginTop: spacing.md },
});
