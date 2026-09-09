import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { createPaymentOrder, payWithCod, simulatePaymentCallback } from "../../api/payments";
import type { PaymentOrder } from "../../api/payments";
import { formatCurrency } from "../../lib/format";
import { Button, Card, ErrorState, LoadingState } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<HomeStackParamList, "Checkout">;

// Customer journey step 4 (Part B) — Requirement 5. Razorpay test-mode
// checkout.
//
// GAP: this Expo-managed app has no Razorpay native SDK wired in (that
// needs a config plugin / dev client — out of scope for this phase), so
// there is no real "Pay now" button. In production this screen would
// launch Razorpay's checkout UI with razorpayOrderId/razorpayKeyId below.
// For demos, "Simulate Payment" calls POST /payments/simulate-callback,
// which runs the same server-side signature-verified capture logic as a
// real Razorpay webhook (see payment.controller.ts) — nothing about
// "paid" is decided in this component.
export default function CheckoutScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { bookingId } = route.params;
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [choosingCod, setChoosingCod] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    createPaymentOrder(bookingId)
      .then(setOrder)
      .catch(() => setError(t("checkout.loadError")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Once the booking is created + a payment choice is made, the slot
  // picker / pricing / this screen are all behind us. Rebuild the stack
  // as [tab home] -> [tracking] so both the header back arrow AND the
  // tracking screen's "Back to Home" land on the tab's home screen —
  // never back into a finished checkout (which caused a redirect loop).
  function goToTracking() {
    navigation.reset({
      index: 1,
      routes: [
        { name: navigation.getState().routes[0].name as never },
        { name: "BookingTracking" as never, params: { bookingId } as never },
      ],
    });
  }

  async function handleSimulate() {
    setSimulating(true);
    setError(null);
    try {
      await simulatePaymentCallback(bookingId);
      setPaid(true);
    } catch {
      setError(t("checkout.simulateError"));
    } finally {
      setSimulating(false);
    }
  }

  async function handleCod() {
    setChoosingCod(true);
    setError(null);
    try {
      await payWithCod(bookingId);
      goToTracking();
    } catch {
      setError(t("checkout.codError"));
      setChoosingCod(false);
    }
  }

  if (error && !order) return <ErrorState message={error} />;
  if (!order) return <LoadingState />;

  const money = (n: number) => formatCurrency(n, i18n.language);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("checkout.title")}</Text>
      <Text style={styles.meta}>
        {t("checkout.order")}: {order.razorpayOrderId}
      </Text>
      {order.isMock && <Text style={styles.mockNotice}>{t("checkout.mockNotice")}</Text>}

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{t("checkout.bookingSummary")}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t("checkout.amountDue")}</Text>
          <Text style={styles.value}>{money(order.amount / 100)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.smallLabel}>{t("checkout.welfareIncluded")}</Text>
          <Text style={styles.smallValue}>{money(order.breakdown.welfareContribution)}</Text>
        </View>
        <View style={styles.rowLast}>
          <Text style={styles.smallLabel}>{t("checkout.federationIncluded")}</Text>
          <Text style={styles.smallValue}>{money(order.breakdown.federationFee)}</Text>
        </View>
      </Card>

      {paid ? (
        <>
          <Text style={styles.successNotice}>{t("checkout.simulateSuccess")}</Text>
          <Button label={t("checkout.trackBooking")} onPress={goToTracking} style={styles.button} />
        </>
      ) : (
        <>
          <Text style={styles.methodLabel}>{t("checkout.paymentMethod")}</Text>
          <Button
            label={t("checkout.payOnline")}
            onPress={handleSimulate}
            loading={simulating}
            disabled={choosingCod}
            style={styles.button}
          />
          <Button
            label={t("checkout.payCod")}
            variant="outline"
            onPress={handleCod}
            loading={choosingCod}
            disabled={simulating}
            style={styles.button}
          />
          <Text style={styles.codNote}>{t("checkout.codNote")}</Text>
        </>
      )}
      {error && !paid && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  meta: { ...type.small, color: colors.textSecondary, marginBottom: spacing.md },
  mockNotice: { ...type.small, color: colors.warning, marginBottom: spacing.sm },
  methodLabel: { ...type.smallMedium, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.sm },
  codNote: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },
  successNotice: { ...type.smallMedium, color: colors.success, marginBottom: spacing.sm },
  errorText: { ...type.small, color: colors.error, marginTop: spacing.md },
  summaryCard: { marginVertical: spacing.lg },
  summaryLabel: { ...type.smallMedium, color: colors.textSecondary, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: { ...type.body, color: colors.textSecondary, flexShrink: 1 },
  value: { ...type.h3, color: colors.textPrimary, flexShrink: 0, textAlign: "right" },
  smallLabel: { ...type.small, color: colors.textMuted, flexShrink: 1 },
  smallValue: { ...type.small, color: colors.textMuted, flexShrink: 0, textAlign: "right" },
  button: { marginTop: spacing.lg },
});
