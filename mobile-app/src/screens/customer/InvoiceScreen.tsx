import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { getInvoice } from "../../api/payments";
import type { Invoice } from "../../api/payments";
import { formatDateTime } from "../../lib/format";
import { formatCurrency } from "../../lib/format";
import { Card, ErrorState, LoadingState, PriceBreakdown, StatusBadge } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

type Props = NativeStackScreenProps<HomeStackParamList, "Invoice">;

// Customer journey step 4 (Part B) — Requirement 5, and the booking
// confirmation moment (master prompt §17). Repeats the same itemization
// as FairPricingBreakdownScreen via the shared PriceBreakdown component:
// worker share, federation fee, and welfare contribution as three
// separate line items.
export default function InvoiceScreen({ route }: Props) {
  const { t, i18n } = useTranslation();
  const { bookingId } = route.params;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    getInvoice(bookingId)
      .then(setInvoice)
      .catch(() => setError(t("invoice.loadError")));
  }

  useEffect(load, [bookingId]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!invoice) return <LoadingState />;

  const { lineItems } = invoice;
  const money = (n: number) => formatCurrency(n, i18n.language);
  const isPaid = invoice.paymentStatus === "paid" || invoice.paymentStatus === "PAID";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.successIconWrap}>
        <Ionicons
        name={isPaid ? icons.verified : icons.invoice}
        size={iconSize.hero}
        color={isPaid ? colors.success : colors.textSecondary}
        style={styles.successIcon}
      />
      </View>
      <Text style={styles.title}>{isPaid ? "Booking confirmed" : t("invoice.titlePrefix")}</Text>
      <Text style={styles.subtitle}>
        {invoice.worker.name} — {invoice.service.name}
      </Text>
      {invoice.issuedAt && (
        <Text style={styles.meta}>{formatDateTime(invoice.issuedAt, i18n.language)}</Text>
      )}

      <View style={styles.badgeRow}>
        <StatusBadge status={invoice.paymentStatus} />
        <Text style={styles.invoiceId}>
          {t("invoice.titlePrefix")} #{invoice.invoiceId.slice(0, 8).toUpperCase()}
        </Text>
      </View>

      <Card style={styles.card}>
        <PriceBreakdown
          totalAmount={lineItems.totalAmount}
          workerShare={lineItems.workerShare}
          federationFee={lineItems.federationFee}
          welfareContribution={lineItems.welfareContribution}
          emergencyBonus={lineItems.emergencyBonus}
          isEmergency={invoice.isEmergency}
          money={money}
          labels={{
            totalPrice: t("invoice.totalPaid"),
            workerShare: t("fairPricing.workerShare"),
            federationFee: t("fairPricing.federationFee"),
            welfareContribution: t("fairPricing.welfareContribution"),
            emergencyBonus: t("fairPricing.emergencyBonus"),
            emergencyBonusNote: `100% of this ${money(lineItems.emergencyBonus)} ${t(
              "fairPricing.emergencyBonusNote"
            )}`,
          }}
        />
      </Card>

      <View style={styles.impactCard}>
        <Text style={styles.impactText}>
          {money(lineItems.welfareContribution)} added to {invoice.worker.name}'s welfare fund
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  successIconWrap: { alignItems: "center", marginBottom: spacing.md },
  successIcon: { fontSize: 48 },
  title: { ...type.h1, color: colors.textPrimary, textAlign: "center" },
  subtitle: { ...type.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs },
  meta: { ...type.small, color: colors.textMuted, textAlign: "center", marginTop: 2 },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  invoiceId: { ...type.caption, color: colors.textMuted },
  card: { marginBottom: spacing.lg },
  impactCard: {
    backgroundColor: colors.successLight,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: "center",
  },
  impactText: { ...type.smallMedium, color: colors.success, textAlign: "center" },
});
