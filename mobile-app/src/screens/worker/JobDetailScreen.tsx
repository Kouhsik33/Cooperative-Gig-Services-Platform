import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { WorkerStackParamList } from "../../navigation/WorkerNavigator";
import {
  getBookingById,
  requestCompletion,
  updateBookingStatus,
  verifyServiceOtp,
} from "../../api/bookings";
import type { Booking } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { getSocket } from "../../lib/socket";
import {
  Avatar,
  Badge,
  Button,
  Card,
  LoadingState,
  OtpInput,
  PriceBreakdown,
  StatusBadge,
} from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<WorkerStackParamList, "JobDetail">;

// The worker's whole job lifecycle lives on this one screen (product-flow
// update §17-21, §28), switching what it shows by booking.status rather
// than being N separate screens. IN_PROGRESS and COMPLETED are only ever
// reached via a customer-issued, server-validated OTP — this screen never
// marks either state itself (§20).
export default function JobDetailScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBooking(await getBookingById(bookingId));
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
    socket.on("booking:statusUpdate", onUpdate);
    return () => {
      socket.off("booking:statusUpdate", onUpdate);
    };
  }, [bookingId, load]);

  async function transition(status: Parameters<typeof updateBookingStatus>[1]) {
    setActing(true);
    try {
      setBooking(await updateBookingStatus(bookingId, status));
    } catch {
      Alert.alert("Could not update this job. Please try again.");
    } finally {
      setActing(false);
    }
  }

  async function handleRequestCompletion() {
    setActing(true);
    try {
      setBooking(await requestCompletion(bookingId));
    } catch {
      Alert.alert("Could not complete this job. Please try again.");
    } finally {
      setActing(false);
    }
  }

  async function handleVerifyOtp(purpose: "SERVICE_START" | "SERVICE_COMPLETION") {
    setActing(true);
    setOtpError(null);
    try {
      setBooking(await verifyServiceOtp(bookingId, purpose, otp));
      setOtp("");
    } catch (err: any) {
      setOtpError(err?.response?.data?.error ?? "Incorrect OTP. Please try again.");
    } finally {
      setActing(false);
    }
  }

  function callCustomer() {
    if (!booking?.customer?.phone) return;
    Linking.openURL(`tel:${booking.customer.phone}`);
  }

  if (loading || !booking) return <LoadingState />;

  const money = (n: number) => formatCurrency(n, i18n.language);
  // This screen is only ever reached for a booking already assigned to
  // this worker (dispatch model §13/§24 — REQUESTED/unassigned requests
  // are shown as their own incoming-request cards, not drilled into
  // here), so contact info is always available.
  const address = [booking.serviceAddressLine, booking.serviceLandmark, booking.servicePincode]
    .filter(Boolean)
    .join(", ");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.serviceName}>
          {booking.service.name}
          {booking.isEmergency && <Badge label="EMERGENCY" tone="error" />}
        </Text>
        <StatusBadge status={booking.status} />
      </View>
      <Text style={styles.meta}>{formatDateTime(booking.scheduledAt, i18n.language)}</Text>

      {address ? (
        <Card style={styles.addressCard}>
          <Text style={styles.addressTitle}>Customer location</Text>
          <Text style={styles.addressLine}>{address}</Text>
          {booking.instructions && (
            <Text style={styles.instructions}>"{booking.instructions}"</Text>
          )}
        </Card>
      ) : null}

      <View style={styles.contactRow}>
        <Avatar name={booking.customer?.name ?? "Customer"} size={40} />
        <View style={styles.contactText}>
          <Text style={styles.contactName}>{booking.customer?.name}</Text>
          <Text style={styles.contactSub}>Customer</Text>
        </View>
        <Button label="📞 Call" variant="outline" onPress={callCustomer} style={styles.contactButton} />
        <Button
          label="💬 Chat"
          variant="outline"
          onPress={() => navigation.navigate("Chat", { bookingId, otherPartyName: booking.customer?.name ?? "Customer" })}
          style={styles.contactButton}
        />
      </View>

      {booking.status === "ASSIGNED" && (
        <DemoMap label="Route to customer" />
      )}
      {booking.status === "ON_THE_WAY" && <DemoMap label="On the way to customer" active />}

      <Card style={styles.actionCard}>
        {booking.status === "ASSIGNED" && (
          <Button label="Start navigating" onPress={() => transition("ON_THE_WAY")} loading={acting} />
        )}
        {booking.status === "ON_THE_WAY" && (
          <Button label="I've arrived" onPress={() => transition("ARRIVED")} loading={acting} />
        )}
        {booking.status === "ARRIVED" && (
          <View>
            <Text style={styles.otpPrompt}>Ask the customer for the 4-digit service start OTP.</Text>
            <OtpInput value={otp} onChange={setOtp} />
            {otpError && <Text style={styles.otpError}>{otpError}</Text>}
            <Button
              label="Start service"
              onPress={() => handleVerifyOtp("SERVICE_START")}
              loading={acting}
              disabled={otp.length < 4}
              style={styles.otpButton}
            />
          </View>
        )}
        {booking.status === "IN_PROGRESS" && (
          <View>
            <Text style={styles.inProgressText}>
              Started {booking.serviceStartedAt ? formatDateTime(booking.serviceStartedAt, i18n.language) : ""}
            </Text>
            <Button label="Complete service" onPress={handleRequestCompletion} loading={acting} />
          </View>
        )}
        {booking.status === "COMPLETION_PENDING" && (
          <View>
            <Text style={styles.otpPrompt}>Ask the customer for the 4-digit completion OTP.</Text>
            <OtpInput value={otp} onChange={setOtp} />
            {otpError && <Text style={styles.otpError}>{otpError}</Text>}
            <Button
              label="Complete service"
              onPress={() => handleVerifyOtp("SERVICE_COMPLETION")}
              loading={acting}
              disabled={otp.length < 4}
              style={styles.otpButton}
            />
          </View>
        )}
        {booking.status === "COMPLETED" && (
          <View>
            <Text style={styles.completedText}>
              ✓ Completed{" "}
              {booking.serviceCompletedAt ? formatDateTime(booking.serviceCompletedAt, i18n.language) : ""}
            </Text>
            <PriceBreakdown
              compact
              totalAmount={booking.totalAmount}
              workerShare={booking.workerShare}
              federationFee={booking.federationFee}
              welfareContribution={booking.welfareContribution}
              emergencyBonus={booking.emergencyBonus}
              isEmergency={booking.isEmergency}
              money={money}
              labels={{
                totalPrice: t("fairPricing.totalPrice"),
                workerShare: t("fairPricing.workerShare"),
                federationFee: t("fairPricing.federationFee"),
                welfareContribution: t("fairPricing.welfareContribution"),
                emergencyBonus: t("fairPricing.emergencyBonus"),
                emergencyBonusNote: `+${money(booking.emergencyBonus)} ${t("worker.emergencyBonusIncluded")}`,
              }}
            />
          </View>
        )}
        {(booking.status === "CANCELLED" || booking.status === "REJECTED") && (
          <Text style={styles.cancelledText}>This job was {booking.status.toLowerCase()}.</Text>
        )}
      </Card>

      {["ASSIGNED", "ON_THE_WAY", "ARRIVED"].includes(booking.status) && (
        <Button
          label="Cancel job"
          variant="outline"
          onPress={() => transition("CANCELLED")}
          style={styles.cancelButton}
        />
      )}
    </ScrollView>
  );
}

function DemoMap({ label, active }: { label: string; active?: boolean }) {
  return (
    <View style={styles.mapBox}>
      <Text style={styles.mapPin}>📍</Text>
      <Text style={styles.mapLabel}>{label}</Text>
      <Text style={styles.mapCaption}>
        {active ? "Live GPS tracking isn't wired up in this demo" : "Navigation preview"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  serviceName: { ...type.h1, color: colors.textPrimary, flexShrink: 1, marginRight: spacing.sm },
  meta: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  addressCard: { marginBottom: spacing.lg },
  addressTitle: { ...type.smallMedium, color: colors.textSecondary },
  addressLine: { ...type.body, color: colors.textPrimary, marginTop: spacing.xs },
  instructions: { ...type.small, color: colors.textMuted, marginTop: spacing.sm, fontStyle: "italic" },
  contactRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  contactText: { flex: 1, marginLeft: spacing.md },
  contactName: { ...type.bodyMedium, color: colors.textPrimary },
  contactSub: { ...type.caption, color: colors.textMuted },
  contactButton: { paddingHorizontal: spacing.md, marginLeft: spacing.sm },
  mapBox: {
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  mapPin: { fontSize: 28, marginBottom: spacing.xs },
  mapLabel: { ...type.bodyMedium, color: colors.primaryDark },
  mapCaption: { ...type.caption, color: colors.primaryDark, marginTop: 2 },
  actionCard: { marginBottom: spacing.lg },
  otpPrompt: { ...type.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: "center" },
  otpError: { ...type.small, color: colors.error, textAlign: "center", marginTop: spacing.md },
  otpButton: { marginTop: spacing.lg },
  inProgressText: { ...type.body, color: colors.textSecondary, marginBottom: spacing.lg },
  completedText: { ...type.bodyMedium, color: colors.success, marginBottom: spacing.md },
  cancelledText: { ...type.body, color: colors.textMuted },
  cancelButton: { borderColor: colors.error },
});
