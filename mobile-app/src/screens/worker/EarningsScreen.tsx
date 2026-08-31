import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { listMyBookings } from "../../api/bookings";
import type { Booking } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { Card, EmptyState, ErrorState, LoadingState, PriceBreakdown, WelfareCard } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

// Worker Earnings tab (Part B) — Requirement 12. Running total + per-job
// breakdown, sharing PriceBreakdown with the customer's Fair Pricing
// screen so both sides always see the same numbers, same labels.
export default function EarningsScreen() {
  const { t, i18n } = useTranslation();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bookings = await listMyBookings();
      setJobs(bookings.filter((b) => b.status === "COMPLETED"));
      setError(null);
    } catch {
      setError(t("earnings.loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const runningTotal = jobs.reduce((sum, j) => sum + j.workerShare, 0);
  const emergencyTotal = jobs.reduce((sum, j) => sum + j.emergencyBonus, 0);
  const money = (n: number) => formatCurrency(n, i18n.language);

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={jobs}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>{t("worker.earningsTitle")}</Text>
          <WelfareCard label={t("earnings.runningTotal")} amount={money(runningTotal)} />
          {emergencyTotal > 0 && (
            <View style={styles.emergencyStrip}>
              <Text style={styles.emergencyStripText}>
                Includes {money(emergencyTotal)} in emergency incentives — 100% yours.
              </Text>
            </View>
          )}
          <Text style={styles.sectionTitle}>{t("earnings.jobHistory")}</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="💼" title={t("earnings.noJobs")} />}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Text style={styles.serviceName}>{item.service.name}</Text>
          <Text style={styles.meta}>{formatDateTime(item.scheduledAt, i18n.language)}</Text>
          <View style={styles.breakdownWrap}>
            <PriceBreakdown
              compact
              totalAmount={item.totalAmount}
              workerShare={item.workerShare}
              federationFee={item.federationFee}
              welfareContribution={item.welfareContribution}
              emergencyBonus={item.emergencyBonus}
              isEmergency={item.isEmergency}
              money={money}
              labels={{
                totalPrice: t("fairPricing.totalPrice"),
                workerShare: t("fairPricing.workerShare"),
                federationFee: t("fairPricing.federationFee"),
                welfareContribution: t("fairPricing.welfareContribution"),
                emergencyBonus: t("fairPricing.emergencyBonus"),
                emergencyBonusNote: `+${money(item.emergencyBonus)} ${t("worker.emergencyBonusIncluded")}`,
              }}
            />
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  emergencyStrip: {
    backgroundColor: colors.secondaryLight,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  emergencyStripText: { ...type.small, color: colors.secondaryDark, fontWeight: "600" },
  sectionTitle: { ...type.h3, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  serviceName: { ...type.h3, color: colors.textPrimary },
  meta: { ...type.small, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  breakdownWrap: { marginTop: spacing.xs },
});
