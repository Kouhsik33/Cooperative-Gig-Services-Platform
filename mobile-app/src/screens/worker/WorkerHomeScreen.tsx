import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/WorkerNavigator";
import { useAuth } from "../../store/AuthContext";
import { useTabSwitch } from "../../navigation/TabSwitchContext";
import { useBookingSync } from "../../lib/useBookingSync";
import { acceptBooking, listIncomingRequests, listMyBookings } from "../../api/bookings";
import type { IncomingRequest } from "../../api/bookings";
import { getWorker, getWorkerWelfare, updateAvailability } from "../../api/workers";
import type { WorkerAvailability } from "../../api/workers";
import type { Booking, BookingStatus } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../lib/format";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import NotificationBell from "../../components/NotificationBell";
import { Card, ErrorState, RequestCard, SkeletonList, StatCard, StatusBadge, VerifiedBadge } from "../../components/ui";
import { borders, colors, radius, shadow, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const switchTab = useTabSwitch();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [welfareToday, setWelfareToday] = useState(0);
  const [availability, setAvailability] = useState<WorkerAvailability>("AVAILABLE");
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [all, requests] = await Promise.all([listMyBookings(), listIncomingRequests()]);
      setLoadFailed(false);
      setBookings(all.filter((b) => MY_JOB_STATUSES.includes(b.status) || b.status === "COMPLETED"));
      setIncoming(requests);
      if (user?.worker?.id) {
        const [welfare, profile] = await Promise.all([
          getWorkerWelfare(user.worker.id),
          getWorker(user.worker.id),
        ]);
        setAvailability(profile.availability);
        setRatingAvg(profile.ratingAvg ?? null);
        setWelfareToday(
          welfare.transactions
            .filter((t) => t.type === "contribution" && isToday(t.createdAt))
            .reduce((sum, t) => sum + t.amount, 0)
        );
      }
    } catch {
      // Was uncaught: the home screen rendered zeroed stats with no hint
      // that anything had failed.
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [user?.worker?.id]);

  useBookingSync(load);

  if (loading) return <SkeletonList count={3} variant="row" />;
  if (loadFailed) {
    return <ErrorState message={t("common.loadFailed")} onRetry={load} retryLabel={t("common.retry")} />;
  }

  const todaysBookings = bookings.filter((b) => isToday(b.scheduledAt));
  const todaysEarnings = todaysBookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + b.workerShare, 0);
  const previewRequests = incoming.slice(0, 3);
  // The single most actionable thing on this screen: a job already in
  // flight outranks browsing new requests, so it renders first.
  const activeJob = bookings.find((b) => MY_JOB_STATUSES.includes(b.status)) ?? null;
  const upcomingCount = bookings.filter(
    (b) => MY_JOB_STATUSES.includes(b.status) && b.id !== activeJob?.id
  ).length;

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
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            <Text style={styles.greetingPrefix}>
              {i18n.language === "hi" ? "नमस्ते " : i18n.language === "mr" ? "नमस्कार " : i18n.language === "te" ? "నమస్తే " : "Hi "}
            </Text>
            <Text style={styles.userNameHighlight}>
              {user?.name?.split(" ")[0] ?? ""}
            </Text>
          </Text>
          <VerifiedBadge label={t("profile.verifiedProfessional")} />
        </View>
        <NotificationBell onPress={() => navigation.navigate("Notifications")} />
      </View>
      <View style={styles.switcher}>
        <LanguageSwitcher persist />
      </View>

      <Card style={styles.availabilityCard}>
        <View style={styles.availabilityRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.availabilityLabel}>
              {availability === "BUSY"
                ? t("workerHome.onJob")
                : availability === "AVAILABLE"
                ? t("workerHome.online")
                : t("workerHome.offline")}
            </Text>
            <Text style={styles.availabilitySub}>
              {availability === "BUSY"
                ? t("workerHome.busyHint")
                : t("workerHome.availabilityHint")}
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

      {activeJob && (
        <TouchableOpacity
          onPress={() => navigation.navigate("JobDetail", { bookingId: activeJob.id })}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Card style={styles.activeJobCard}>
            <View style={styles.activeJobHeader}>
              <Text style={styles.activeJobLabel}>{t("workerHome.activeJob")}</Text>
              <StatusBadge status={activeJob.status} />
            </View>
            <Text style={styles.activeJobService}>{activeJob.service.name}</Text>
            <Text style={styles.activeJobMeta}>
              {formatDateTime(activeJob.scheduledAt, i18n.language)}
            </Text>
            <View style={styles.ctaRow}>
              <Text style={styles.activeJobCta}>{t("workerHome.openJob")}</Text>
              <Ionicons name={icons.chevron} size={iconSize.sm} color={colors.primary} />
            </View>
          </Card>
        </TouchableOpacity>
      )}

      <View style={styles.statRow}>
        <StatCard label={t("workerHome.todaysJobs")} value={String(todaysBookings.length)} tone="yellow" />
        <StatCard
          label={t("workerHome.todaysEarnings")}
          value={formatCurrency(todaysEarnings, i18n.language)}
          tone="lime"
        />
      </View>
      <View style={styles.statRow}>
        <StatCard label={t("workerHome.upcomingJobs")} value={String(upcomingCount)} tone="cyan" />
        <StatCard
          label={t("workerHome.yourRating")}
          value={ratingAvg && ratingAvg > 0 ? ratingAvg.toFixed(1) : t("workerHome.notRatedYet")}
          tone="purple"
        />
      </View>
      <View style={styles.statRow}>
        <StatCard label={t("workerHome.welfareToday")} value={formatCurrency(welfareToday, i18n.language)} tone="peach" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("workerHome.newRequests")}</Text>
        <TouchableOpacity onPress={() => switchTab("jobs")} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.viewAll}>{t("workerHome.viewAll")}</Text>
        </TouchableOpacity>
      </View>

      {previewRequests.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>{t("workerHome.noRequests")}</Text>
        </Card>
      ) : (
        previewRequests.map((req) => (
          <RequestCard
            key={req.id}
            request={req}
            accepting={acceptingId === req.id}
            disabled={acceptingId !== null}
            onAccept={() => accept(req.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl + 40, backgroundColor: colors.background },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  greeting: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.sm },
  greetingPrefix: { fontFamily: "JosefinSans", fontWeight: "700" },
  userNameHighlight: { fontFamily: "Kaltera", fontWeight: "900" },
  switcher: { marginVertical: spacing.md, alignItems: "flex-start" },
  availabilityCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: borders.color,
    borderRadius: radius.lg,
    ...shadow.sm,
  },
  activeJobCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderColor: borders.color,
    borderWidth: borders.default,
    borderRadius: radius.xl,
    ...shadow.md,
  },
  activeJobHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activeJobLabel: { ...type.caption, fontWeight: "800", color: colors.primaryDark, textTransform: "uppercase" },
  activeJobService: { ...type.h2, fontWeight: "900", color: colors.textPrimary, marginTop: spacing.xs },
  activeJobMeta: { ...type.small, fontWeight: "600", color: colors.textPrimary, marginTop: 2 },
  activeJobCta: { ...type.smallMedium, fontWeight: "800", color: colors.primaryDark, textDecorationLine: "underline", marginTop: spacing.md },
  availabilityRow: { flexDirection: "row", alignItems: "center" },
  availabilityLabel: { ...type.bodyMedium, fontWeight: "800", color: colors.textPrimary },
  availabilitySub: { ...type.caption, fontWeight: "600", color: colors.textSecondary, marginTop: 2 },
  statRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...type.h3, fontWeight: "900", color: colors.textPrimary },
  viewAll: {
    ...type.caption,
    fontWeight: "800",
    color: colors.textPrimary,
    backgroundColor: colors.skyLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: borders.thin,
    borderColor: borders.color,
  },
  emptyText: { ...type.body, fontWeight: "600", color: colors.textSecondary },
});
