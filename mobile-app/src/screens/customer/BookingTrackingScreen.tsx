import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
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
import { Avatar, Button, Card, LoadingState, StatusBadge } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<HomeStackParamList, "BookingTracking">;

const TIMELINE = [
  { key: "ASSIGNED", label: "Professional assigned" },
  { key: "ON_THE_WAY", label: "On the way" },
  { key: "ARRIVED", label: "Arrived" },
  { key: "IN_PROGRESS", label: "Service in progress" },
  { key: "COMPLETED", label: "Service completed" },
];

const SEARCH_STEPS = ["Checking availability", "Matching skills", "Checking service area"];

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
  const [redispatching, setRedispatching] = useState(false);

  const load = useCallback(async () => {
    try {
      const b = await getBookingById(bookingId);
      setBooking(b);
      if (b.status === "ARRIVED") {
        const code = await getServiceOtp(bookingId, "SERVICE_START");
        setOtp({ purpose: "SERVICE_START", otp: code.otp });
      } else if (b.status === "COMPLETION_PENDING") {
        const code = await getServiceOtp(bookingId, "SERVICE_COMPLETION");
        setOtp({ purpose: "SERVICE_COMPLETION", otp: code.otp });
      } else {
        setOtp(null);
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

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
      Alert.alert("Could not search again right now. Please try again.");
    } finally {
      setRedispatching(false);
    }
  }

  function confirmCancel() {
    Alert.alert(
      "Cancel booking?",
      "Cancellation policy: this booking will be cancelled immediately and cannot be undone.",
      [
        { text: "Keep booking", style: "cancel" },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: async () => {
            const updated = await updateBookingStatus(bookingId, "CANCELLED");
            setBooking(updated);
          },
        },
      ]
    );
  }

  if (loading || !booking) return <LoadingState />;

  if (booking.status === "REQUESTED") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.searchingHero}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.searchingTitle}>Finding a verified professional near you...</Text>
          <Text style={styles.searchingSubtitle}>{booking.service.name}</Text>
        </View>

        <Card style={styles.searchStepsCard}>
          {SEARCH_STEPS.map((step) => (
            <Text key={step} style={styles.searchStep}>
              ● {step}
            </Text>
          ))}
          {booking.eligibleWorkerCount != null && (
            <Text style={styles.searchMeta}>
              {booking.eligibleWorkerCount > 0
                ? `${booking.eligibleWorkerCount} nearby professional${booking.eligibleWorkerCount === 1 ? "" : "s"} notified`
                : "No professional is currently available in this area."}
            </Text>
          )}
        </Card>

        <Button label="Keep searching" onPress={keepSearching} loading={redispatching} style={styles.searchAction} />
        <Button
          label="Change service"
          variant="outline"
          onPress={() => navigation.popToTop()}
          style={styles.searchAction}
        />
        <Button label="Cancel booking" variant="outline" onPress={confirmCancel} style={styles.cancelButton} />
      </ScrollView>
    );
  }

  const currentIndex = TIMELINE.findIndex((s) => s.key === booking.status);
  const isTerminal = ["CANCELLED", "REJECTED", "EXPIRED"].includes(booking.status);
  const canCancel = !isTerminal && booking.status !== "COMPLETED";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.workerRow}>
        <Avatar name={booking.worker?.user.name ?? "?"} size={52} />
        <View style={styles.workerText}>
          <Text style={styles.workerName}>{booking.worker?.user.name}</Text>
          <Text style={styles.serviceName}>{booking.service.name}</Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      {booking.worker && (
        <View style={styles.contactRow}>
          <Button label="📞 Call professional" variant="outline" onPress={callWorker} style={styles.contactButton} />
          <Button
            label="💬 Chat"
            variant="outline"
            onPress={() =>
              navigation.navigate("Chat", { bookingId, otherPartyName: booking.worker!.user.name })
            }
            style={styles.contactButton}
          />
        </View>
      )}

      {!isTerminal && (
        <Card style={styles.timelineCard}>
          {TIMELINE.map((step, i) => (
            <View key={step.key} style={styles.timelineRow}>
              <View style={[styles.timelineDot, i <= currentIndex && styles.timelineDotDone]} />
              <Text style={[styles.timelineLabel, i <= currentIndex && styles.timelineLabelDone]}>
                {step.label}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {isTerminal && (
        <Card style={styles.timelineCard}>
          <Text style={styles.cancelledText}>This booking was {booking.status.toLowerCase()}.</Text>
        </Card>
      )}

      {otp && (
        <Card style={styles.otpCard}>
          <Text style={styles.otpTitle}>
            {otp.purpose === "SERVICE_START"
              ? "Your professional has arrived"
              : "Your professional has finished the service"}
          </Text>
          <Text style={styles.otpSubtitle}>
            {otp.purpose === "SERVICE_START" ? "Service start OTP" : "Completion OTP"}
          </Text>
          <Text style={styles.otpValue}>{otp.otp}</Text>
          <Text style={styles.otpHint}>Share this code with your professional to continue.</Text>
        </Card>
      )}

      {booking.status === "IN_PROGRESS" && booking.serviceStartedAt && (
        <Text style={styles.startedText}>
          Started at {formatDateTime(booking.serviceStartedAt, i18n.language)}
        </Text>
      )}

      {booking.status === "COMPLETED" && (
        <View style={styles.completedActions}>
          <Text style={styles.completedText}>
            Service completed at{" "}
            {booking.serviceCompletedAt ? formatDateTime(booking.serviceCompletedAt, i18n.language) : ""}
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
        <Button label="Cancel booking" variant="outline" onPress={confirmCancel} style={styles.cancelButton} />
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
  searchStep: { ...type.body, color: colors.textSecondary, marginBottom: spacing.sm },
  searchMeta: { ...type.smallMedium, color: colors.primaryDark, marginTop: spacing.sm },
  searchAction: { marginBottom: spacing.md },
  workerRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  workerText: { flex: 1, marginLeft: spacing.md },
  workerName: { ...type.h3, color: colors.textPrimary },
  serviceName: { ...type.small, color: colors.textSecondary, marginTop: 2 },
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
