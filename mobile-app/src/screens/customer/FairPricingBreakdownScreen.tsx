import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { createBooking, createEmergencyBooking } from "../../api/bookings";
import { getService } from "../../api/services";
import type { ServiceDetail, WageSplitPreview } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../lib/format";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  FormScreen,
  PriceBreakdown,
  SkeletonList,
} from "../../components/ui";
import { borders, colors, radius, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<HomeStackParamList, "FairPricingBreakdown">;

// The booking confirmation screen — Requirement 12, and the single most
// important moment in the customer journey: exactly what is being booked,
// exactly what it costs, and exactly how that money is split, all before
// anything is committed.
//
// This screen used to create the booking in a mount effect and *then* show
// a confirm button. That meant simply opening it produced a live REQUESTED
// booking broadcast to every eligible worker — a customer who backed out
// left workers chasing a job nobody wanted. Now it renders a server-computed
// preview and only creates the booking when the customer actually confirms,
// so dispatch fires at the moment the customer commits.
export default function FairPricingBreakdownScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const {
    serviceId,
    packageId,
    packageIds,
    packageName,
    selectedTasks,
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

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getService(serviceId, latitude, longitude, servicePincode)
      .then((data) => {
        setService(data);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [serviceId, latitude, longitude, servicePincode]);

  useEffect(load, [load]);

  async function confirm() {
    setConfirming(true);
    setConfirmError(null);
    try {
      const create = isEmergency ? createEmergencyBooking : createBooking;
      const booking = await create({
        serviceId,
        packageId,
        packageIds,
        scheduledAt,
        latitude,
        longitude,
        serviceAddressLine,
        serviceLandmark,
        servicePincode,
        contactName,
        contactPhone,
        instructions,
      });
      // Replace rather than push: the booking now exists and is being
      // dispatched, so "back" to this confirmation screen would only
      // offer to create it a second time. BookingTracking (reached from
      // Checkout) has its own "Back to Home" escape.
      navigation.replace("Checkout", { bookingId: booking.id });
    } catch {
      setConfirmError(t("fairPricing.createError"));
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <SkeletonList count={3} variant="row" />;
  if (loadFailed || !service) {
    return <ErrorState message={t("fairPricing.loadError")} onRetry={load} retryLabel={t("common.retry")} />;
  }

  const money = (n: number) => formatCurrency(n, i18n.language);
  const chosen = packageId ? service.packages?.find((p) => p.id === packageId) : null;

  // Multi-item task resolution: aggregate previews across all selected tasks
  const chosenPackages = packageIds?.length
    ? service.packages?.filter((p) => packageIds.includes(p.id)) ?? []
    : chosen
    ? [chosen]
    : [];

  let preview: WageSplitPreview | null = null;
  if (chosenPackages.length > 0) {
    const previews = chosenPackages.map((p) =>
      isEmergency ? p.pricePreview.emergency : p.pricePreview.standard
    );
    preview = {
      totalAmount: previews.reduce((sum, p) => sum + p.totalAmount, 0),
      workerShare: previews.reduce((sum, p) => sum + p.workerShare, 0),
      federationFee: previews.reduce((sum, p) => sum + p.federationFee, 0),
      welfareContribution: previews.reduce((sum, p) => sum + p.welfareContribution, 0),
      emergencyBonus: previews.reduce((sum, p) => sum + p.emergencyBonus, 0),
    };
  } else {
    preview = isEmergency
      ? service.pricePreview?.emergency ?? null
      : service.pricePreview?.standard ?? null;
  }

  if (!preview) {
    return <ErrorState message={t("fairPricing.loadError")} onRetry={load} retryLabel={t("common.retry")} />;
  }

  const address = [serviceAddressLine, serviceLandmark, servicePincode].filter(Boolean).join(", ");

  return (
    <FormScreen contentContainerStyle={styles.container}>
      {isEmergency && <Badge label={t("fairPricing.emergencyBadge")} tone="error" />}
      <Text style={styles.title}>{t("fairPricing.title")}</Text>
      <Text style={styles.subtitle}>
        {isEmergency ? t("fairPricing.emergencySubtitle") : t("fairPricing.standardSubtitle")}
      </Text>

      {/* What is actually being booked. Shows the itemized breakdown of each problem/task chosen */}
      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>{t("fairPricing.summary")}</Text>
        <Text style={styles.serviceName}>{service.name}</Text>
        {chosenPackages.length > 0 ? (
          <View style={styles.taskListCard}>
            {chosenPackages.map((task) => (
              <View key={task.id} style={styles.taskItemRow}>
                <View style={styles.taskItemLeft}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  <Text style={styles.taskItemName}>{task.name}</Text>
                </View>
                <Text style={styles.taskItemPrice}>{money(task.price)}</Text>
              </View>
            ))}
          </View>
        ) : (chosen?.name ?? packageName) ? (
          <Text style={styles.packageName}>{chosen?.name ?? packageName}</Text>
        ) : null}
        <SummaryRow label={t("fairPricing.when")} value={formatDateTime(scheduledAt, i18n.language)} />
        {address ? <SummaryRow label={t("fairPricing.where")} value={address} /> : null}
      </Card>

      <Card style={styles.card}>
        <PriceBreakdown
          totalAmount={preview.totalAmount}
          workerShare={preview.workerShare}
          federationFee={preview.federationFee}
          welfareContribution={preview.welfareContribution}
          emergencyBonus={preview.emergencyBonus}
          isEmergency={!!isEmergency}
          money={money}
          labels={{
            totalPrice: t("fairPricing.totalPrice"),
            workerShare: t("fairPricing.workerShare"),
            federationFee: t("fairPricing.federationFee"),
            welfareContribution: t("fairPricing.welfareContribution"),
            emergencyBonus: t("fairPricing.emergencyBonus"),
            emergencyBonusNote: `100% of this ${money(preview.emergencyBonus)} ${t(
              "fairPricing.emergencyBonusNote"
            )}`,
          }}
        />
      </Card>

      <View style={styles.trustNote}>
        <Text style={styles.trustNoteText}>{t("fairPricing.coopNote")}</Text>
      </View>

      <Text style={styles.findingNote}>{t("fairPricing.dispatchNote")}</Text>

      {confirmError && <Text style={styles.error}>{confirmError}</Text>}

      <Button
        label={confirming ? t("fairPricing.creating") : t("fairPricing.confirmBooking")}
        onPress={confirm}
        loading={confirming}
        disabled={confirming}
        style={styles.button}
      />
    </FormScreen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary, marginTop: spacing.sm },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { marginBottom: spacing.lg },
  sectionLabel: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xs },
  serviceName: { ...type.h3, color: colors.textPrimary },
  packageName: { ...type.smallMedium, color: colors.primaryDark, marginTop: 2 },
  taskListCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: borders.thin,
    borderColor: borders.color,
  },
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: spacing.sm,
  },
  taskItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
  },
  taskItemName: {
    ...type.small,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  taskItemPrice: {
    ...type.small,
    fontWeight: "800",
    color: colors.primary,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: spacing.md,
    gap: spacing.md,
  },
  summaryLabel: { ...type.small, color: colors.textSecondary, flexShrink: 1 },
  summaryValue: { ...type.small, color: colors.textPrimary, flex: 1, textAlign: "right" },
  trustNote: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  trustNoteText: { ...type.small, color: colors.primaryDark },
  findingNote: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  error: { ...type.small, color: colors.error, textAlign: "center", marginTop: spacing.md },
  button: { marginTop: spacing.md },
});
