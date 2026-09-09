import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import {
  getBookingById,
  getServiceOtp,
  redispatchBooking,
  updateBookingStatus,
} from "../../api/bookings";
import type { Booking } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import { getSocket } from "../../lib/socket";
import { useLiveTracking } from "../../lib/tracking";
import {
  Avatar,
  BookingTimeline,
  Button,
  Card,
  ErrorState,
  LiveMap,
  Rating,
  SkeletonList,
  StatusBadge,
  TIMELINE_ORDER,
  timelineIndexFor,
} from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

type Props = NativeStackScreenProps<HomeStackParamList, "BookingTracking">;

const TIMELINE_LABEL_KEYS: Record<string, string> = {
  REQUESTED: "tracking.bookingConfirmed",
  ASSIGNED: "tracking.timelineAssigned",
  ON_THE_WAY: "tracking.timelineOnTheWay",
  ARRIVED: "tracking.timelineArrived",
  IN_PROGRESS: "tracking.timelineInProgress",
  COMPLETED: "tracking.timelineCompleted",
};

const SEARCH_STEPS = [
  "tracking.stepAvailability",
  "tracking.stepSkills",
  "tracking.stepArea",
];

// The customer's live view of the booking lifecycle (product-flow update
// §17-21, §27, dispatch model update §17-19/§32/§48). Booking starts
// REQUESTED with no worker (dispatch broadcasting — "Finding a
// professional") and only gets a worker once someone wins the accept
// race; everything else (timeline, OTP reveal, chat/call, rate/invoice)
// is unchanged from before. Updates live via the existing Socket.io
// connection (booking:statusUpdate / booking:otpReady).
export default function BookingTrackingScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState<{ purpose: string; otp: string } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [redispatching, setRedispatching] = useState(false);

  const trackingActive = ["ON_THE_WAY", "ARRIVED"].includes(booking?.status ?? "");
  const tracking = useLiveTracking(bookingId, trackingActive);

  const load = useCallback(async () => {
    try {
      const b = await getBookingById(bookingId);
      setBooking(b);
      setLoadFailed(false);
      if (b.status === "ARRIVED") {
        const code = await getServiceOtp(bookingId, "SERVICE_START");
        setOtp({ purpose: "SERVICE_START", otp: code.otp });
      } else if (b.status === "COMPLETION_PENDING") {
        const code = await getServiceOtp(bookingId, "SERVICE_COMPLETION");
        setOtp({ purpose: "SERVICE_COMPLETION", otp: code.otp });
      } else {
        setOtp(null);
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch every time the screen regains focus — the booking may have
  // been paid, assigned, or advanced while the user was on Checkout or
  // another tab.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // When the simulated drive completes, the backend flips the booking to
  // ARRIVED and emits booking:statusUpdate (which triggers load() below).
  // This is a backstop in case that emit is missed.
  useEffect(() => {
    if (tracking?.phase === "ARRIVED" && booking?.status === "ON_THE_WAY") {
      load();
    }
  }, [tracking?.phase, booking?.status, load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onUpdate(payload: { id: string }) {
      if (payload.id === bookingId) load();
    }
    function onOtp(payload: { bookingId: string }) {
      if (payload.bookingId === bookingId) load();
    }
    socket.on("booking:statusUpdate", onUpdate);
    socket.on("booking:otpReady", onOtp);
    return () => {
      socket.off("booking:statusUpdate", onUpdate);
      socket.off("booking:otpReady", onOtp);
    };
  }, [bookingId, load]);

  function callWorker() {
    if (!booking?.worker?.user.phone) return;
    Linking.openURL(`tel:${booking.worker.user.phone}`);
  }

  async function keepSearching() {
    setRedispatching(true);
    try {
      const updated = await redispatchBooking(bookingId);
      setBooking(updated);
    } catch {
      Alert.alert(t("tracking.searchAgainError"));
    } finally {
      setRedispatching(false);
    }
  }

  function confirmCancel() {
    Alert.alert(
      t("tracking.cancelTitle"),
      t("tracking.cancelPolicy"),
      [
        { text: t("tracking.keepBooking"), style: "cancel" },
        {
          text: t("tracking.cancelBooking"),
          style: "destructive",
          onPress: async () => {
            const updated = await updateBookingStatus(bookingId, "CANCELLED");
            setBooking(updated);
          },
        },
      ]
    );
  }

  if (loading) return <SkeletonList count={3} variant="row" />;
  if (loadFailed || !booking) {
    return <ErrorState message={t("common.bookingLoadFailed")} onRetry={load} retryLabel={t("common.retry")} />;
  }

  if (booking.status === "REQUESTED") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.searchingHero}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.searchingTitle}>{t("tracking.searchingTitle")}</Text>
          <Text style={styles.searchingSubtitle}>{booking.service?.name ?? ""}</Text>
        </View>

        <Card style={styles.searchStepsCard}>
          {SEARCH_STEPS.map((step) => (
            <View key={step} style={styles.searchStepRow}>
              <Ionicons name="ellipse" size={7} color={colors.primary} />
              <Text style={styles.searchStep}>{t(step)}</Text>
            </View>
          ))}
          {booking.eligibleWorkerCount != null && (
            <Text style={styles.searchMeta}>
              {booking.eligibleWorkerCount > 0
                ? t(
                    booking.eligibleWorkerCount === 1
                      ? "tracking.notifiedOne"
                      : "tracking.notifiedMany",
                    { count: booking.eligibleWorkerCount }
                  )
                : t("tracking.noneAvailable")}
            </Text>
          )}
        </Card>

        <Button label={t("tracking.keepSearching")} onPress={keepSearching} loading={redispatching} style={styles.searchAction} />
        <Button
          label={t("tracking.changeService")}
          variant="outline"
          onPress={() => navigation.popToTop()}
          style={styles.searchAction}
        />
        <Button
          label={t("tracking.cancelBooking")}
          variant="outline"
          onPress={confirmCancel}
          style={styles.cancelButton}
        />
      </ScrollView>
    );
  }

  const currentIndex = timelineIndexFor(booking.status);
  const isTerminal = ["CANCELLED", "REJECTED", "EXPIRED"].includes(booking.status);
  const canCancel = !isTerminal && booking.status !== "COMPLETED";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.workerCard}>
        <View style={styles.workerRow}>
          <Avatar name={booking.worker?.user.name ?? "?"} size={52} />
          <View style={styles.workerText}>
            <Text style={styles.workerEyebrow}>{t("tracking.professional")}</Text>
            <Text style={styles.workerName}>{booking.worker?.user.name}</Text>
            <View style={styles.workerMetaRow}>
              {booking.worker?.verificationStatus === "VERIFIED" && (
                <View style={styles.verifiedRow}>
                  <Ionicons name={icons.verified} size={iconSize.xs} color={colors.success} />
                  <Text style={styles.verifiedTag}>{t("tracking.verified")}</Text>
                </View>
              )}
              {booking.worker?.ratingAvg != null && booking.worker.ratingAvg > 0 && (
                <Rating value={booking.worker.ratingAvg} />
              )}
            </View>
          </View>
          <StatusBadge status={booking.status} />
        </View>
        <Text style={styles.serviceName}>{booking.service?.name ?? ""}</Text>
      </Card>

      {booking.worker && (
        <View style={styles.contactRow}>
          <Button label={t("tracking.callProfessional")} variant="outline" onPress={callWorker} style={styles.contactButton} />
          <Button
            label={t("tracking.chat")}
            variant="outline"
            onPress={() =>
              navigation.navigate("Chat", { bookingId, otherPartyName: booking.worker!.user.name })
            }
            style={styles.contactButton}
          />
        </View>
      )}

      {["ASSIGNED", "ON_THE_WAY", "ARRIVED"].includes(booking.status) && (
        <LiveMap
          destination={{
            latitude: booking.latitude ?? 0,
            longitude: booking.longitude ?? 0,
            label: booking.serviceAddressLine ?? t("tracking.yourLocation"),
          }}
          worker={
            tracking
              ? {
                  latitude: tracking.latitude,
                  longitude: tracking.longitude,
                  label: booking.worker?.user.name ?? t("tracking.professional"),
                }
              : null
          }
          phase={
            booking.status === "ARRIVED"
              ? "ARRIVED"
              : booking.status === "ON_THE_WAY"
              ? "EN_ROUTE"
              : "IDLE"
          }
          etaSeconds={tracking?.etaSeconds ?? null}
          distanceKm={tracking?.distanceKm ?? null}
          etaLabel={t("tracking.onTheWayTo")}
          arrivedLabel={t("tracking.timelineArrived")}
        />
      )}

      {!isTerminal && (
        <Card style={styles.timelineCard}>
          <BookingTimeline
            currentIndex={currentIndex}
            steps={TIMELINE_ORDER.map((key) => ({
              key,
              label: t(TIMELINE_LABEL_KEYS[key]),
              detail:
                key === "IN_PROGRESS" && booking.serviceStartedAt
                  ? formatDateTime(booking.serviceStartedAt, i18n.language)
                  : key === "COMPLETED" && booking.serviceCompletedAt
                  ? formatDateTime(booking.serviceCompletedAt, i18n.language)
                  : null,
            }))}
          />
        </Card>
      )}

      {isTerminal && (
        <Card style={styles.timelineCard}>
          <Text style={styles.cancelledText}>
            {t("tracking.terminal", { status: booking.status.toLowerCase() })}
          </Text>
        </Card>
      )}

      {otp && (
        <Card style={styles.otpCard}>
          <Text style={styles.otpTitle}>
            {otp.purpose === "SERVICE_START"
              ? t("tracking.arrivedTitle")
              : t("tracking.finishedTitle")}
          </Text>
          <Text style={styles.otpSubtitle}>
            {otp.purpose === "SERVICE_START" ? t("tracking.startOtp") : t("tracking.completionOtp")}
          </Text>
          <Text style={styles.otpValue}>{otp.otp}</Text>
          <Text style={styles.otpHint}>{t("tracking.otpHint")}</Text>
        </Card>
      )}

      {booking.status === "COMPLETED" && (
        <View style={styles.completedActions}>
          <Text style={styles.completedText}>
            {t("tracking.completedAt", {
              time: booking.serviceCompletedAt
                ? formatDateTime(booking.serviceCompletedAt, i18n.language)
                : "",
            })}
          </Text>
          <Button
            label={t("rating.title")}
            onPress={() => navigation.navigate("Rating", { bookingId })}
            style={styles.actionButton}
          />
          <Button
            label={t("checkout.viewInvoice")}
            variant="outline"
            onPress={() => navigation.navigate("Invoice", { bookingId })}
            style={styles.actionButton}
          />
        </View>
      )}

      {canCancel && (
        <Button
          label={t("tracking.cancelBooking")}
          variant="outline"
          onPress={confirmCancel}
          style={styles.cancelButton}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  searchingHero: { alignItems: "center", paddingVertical: spacing.xxl },
  searchingTitle: { ...type.h2, color: colors.textPrimary, textAlign: "center", marginTop: spacing.lg },
  searchingSubtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs },
  searchStepsCard: { marginBottom: spacing.xl },
  searchStepRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  searchStep: { ...type.body, color: colors.textSecondary },
  searchMeta: { ...type.smallMedium, color: colors.primaryDark, marginTop: spacing.sm },
  searchAction: { marginBottom: spacing.md },
  workerCard: { marginBottom: spacing.lg },
  workerRow: { flexDirection: "row", alignItems: "center" },
  workerEyebrow: { ...type.caption, color: colors.textMuted },
  workerMetaRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs, gap: spacing.sm },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  verifiedTag: { ...type.caption, color: colors.success, fontWeight: "700" },
  workerText: { flex: 1, marginLeft: spacing.md },
  workerName: { ...type.h3, color: colors.textPrimary },
  serviceName: { ...type.small, color: colors.textSecondary, marginTop: spacing.md },
  contactRow: { flexDirection: "row", marginBottom: spacing.xl, gap: spacing.md },
  contactButton: { flex: 1 },
  timelineCard: { marginBottom: spacing.lg },
  timelineRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    marginRight: spacing.md,
  },
  timelineDotDone: { backgroundColor: colors.success },
  timelineLabel: { ...type.body, color: colors.textMuted },
  timelineLabelDone: { color: colors.textPrimary, fontWeight: "600" },
  cancelledText: { ...type.body, color: colors.error },
  otpCard: { backgroundColor: colors.primaryDark, alignItems: "center", marginBottom: spacing.lg },
  otpTitle: { ...type.bodyMedium, color: colors.textInverse, textAlign: "center" },
  otpSubtitle: { ...type.small, color: colors.primaryLight, marginTop: spacing.sm },
  otpValue: { ...type.display, color: colors.textInverse, letterSpacing: 8, marginTop: spacing.xs },
  otpHint: { ...type.caption, color: colors.primaryLight, marginTop: spacing.sm, textAlign: "center" },
  startedText: { ...type.body, color: colors.textSecondary, marginBottom: spacing.lg },
  completedActions: { marginTop: spacing.md },
  cancelButton: { marginTop: spacing.xl, borderColor: colors.error },
  completedText: { ...type.bodyMedium, color: colors.success, marginBottom: spacing.lg },
  actionButton: { marginBottom: spacing.md },
});
