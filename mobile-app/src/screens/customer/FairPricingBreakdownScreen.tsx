import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { createBooking, createEmergencyBooking } from "../../api/bookings";
import type { Booking } from "../../api/types";
import { formatCurrency } from "../../lib/format";
import { Badge, Button, Card, ErrorState, LoadingState, PriceBreakdown } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<HomeStackParamList, "FairPricingBreakdown">;

// Customer journey step 2 (Part B) — Requirement 12, the single most
// important screen in the app: total price, worker's share (₹ and %),
// federation fee, welfare contribution. A deliberate UI moment before
// payment, not an afterthought on a receipt. Also covers the emergency
// case (Requirement 8): surge shown explicitly, entirely credited to
// the worker's share.
export default function FairPricingBreakdownScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const {
    serviceId,
    scheduledAt,
    latitude,
    longitude,
    isEmergency,
    serviceAddressLine,
    serviceLandmark,
    servicePincode,
    contactName,
    contactPhone,
    instructions,
  } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Dispatch model (§8) — this call creates the booking with no worker
    // at all; the backend broadcasts it to every eligible worker and the
    // customer finds out who accepted on BookingTrackingScreen.
    const create = isEmergency ? createEmergencyBooking : createBooking;
    create({
      serviceId,
      scheduledAt,
      latitude,
      longitude,
      serviceAddressLine,
      serviceLandmark,
      servicePincode,
      contactName,
      contactPhone,
      instructions,
    })
      .then(setBooking)
      .catch(() => setError(t("fairPricing.loadError")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, scheduledAt, latitude, longitude, isEmergency]);

  if (loading) return <LoadingState />;
  if (error || !booking) return <ErrorState message={error ?? ""} />;

  const money = (n: number) => formatCurrency(n, i18n.language);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {booking.isEmergency && (
        <Badge label="Emergency booking" tone="error" />
      )}
      <Text style={styles.title}>{t("fairPricing.title")}</Text>
      <Text style={styles.subtitle}>
        {booking.isEmergency
          ? "Your emergency premium goes entirely to the worker."
          : "This is included within the price you pay — nothing extra."}
      </Text>

      <Card style={styles.card}>
        <PriceBreakdown
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
            emergencyBonusNote: `100% of this ${money(
              booking.emergencyBonus
            )} ${t("fairPricing.emergencyBonusNote")}`,
          }}
        />
      </Card>

      <View style={styles.trustNote}>
        <Text style={styles.trustNoteText}>
          Federation fee and welfare contribution are cooperative-owned — not
          platform profit.
        </Text>
      </View>

      <Text style={styles.findingNote}>Find a professional for you — no need to pick one yourself.</Text>

      <Button
        label={t("fairPricing.confirmAndPay")}
        onPress={() => navigation.navigate("Checkout", { bookingId: booking.id })}
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary, marginTop: spacing.sm },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { marginBottom: spacing.lg },
  trustNote: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.md,
  },
  trustNoteText: { ...type.small, color: colors.primaryDark },
  findingNote: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  button: { marginTop: spacing.md },
});
