import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/AuthContext";
import { getWorkerWelfare } from "../../api/workers";
import type { WorkerWelfare } from "../../api/workers";
import { formatCurrency, formatDate } from "../../lib/format";
import { Card, EmptyState, ErrorState, LoadingState, WelfareCard } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";
import { icons, iconSize } from "../../theme/icons";
import { Ionicons } from "@expo/vector-icons";

// Stable keys; the visible label is translated at render.
const BENEFITS = ["health", "insurance", "emergency", "family", "training"] as const;

// Worker Welfare tab (Part B) — Requirement 7. Dedicated, first-class
// screen: welfare fund contribution total, per-job contribution log,
// mocked insurance coverage status. Must not be a hidden ledger entry.
export default function MyWelfareScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [welfare, setWelfare] = useState<WorkerWelfare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!user?.worker?.id) {
      setError(t("myWelfare.loadError"));
      setLoading(false);
      return;
    }
    setLoading(true);
    getWorkerWelfare(user.worker.id)
      .then((w) => {
        setWelfare(w);
        setError(null);
      })
      .catch(() => setError(t("myWelfare.loadError")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [user?.worker?.id]);

  if (loading) return <LoadingState />;
  if (error || !welfare) return <ErrorState message={error ?? ""} onRetry={load} />;

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={welfare.transactions}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>{t("myWelfare.title")}</Text>
          <Text style={styles.tagline}>
            {t("myWelfare.strengthenNote")}
          </Text>

          <WelfareCard
            label={t("myWelfare.totalContributions")}
            amount={formatCurrency(welfare.totalContributions, i18n.language)}
          />

          <Card style={styles.insuranceCard}>
            <View style={styles.insuranceHeader}>
              <Text style={styles.insuranceTitle}>{t("myWelfare.insurance")}</Text>
              {welfare.insuranceStatus === "ACTIVE" && (
                <View style={styles.insuranceRow}>
            <Ionicons name={icons.verified} size={iconSize.sm} color={colors.success} />
            <Text style={styles.insuranceActive}>{t("myWelfare.coverageActive")}</Text>
          </View>
              )}
            </View>
            <View style={styles.insuranceRow}>
              <InsuranceStat label={t("myWelfare.coverage")} value="₹2,00,000" />
              <InsuranceStat label={t("myWelfare.validUntil")} value="31 Mar 2027" />
            </View>
            <Text style={styles.insuranceProvider}>{t("myWelfare.provider")}</Text>
            <Text style={styles.insuranceDemoNote}>
              {t("myWelfare.demoTerms")}
            </Text>
          </Card>

          <Card style={styles.benefitsCard}>
            <Text style={styles.sectionTitle}>{t("myWelfare.benefits")}</Text>
            <View style={styles.benefitsGrid}>
              {BENEFITS.map((b) => (
                <View key={b} style={styles.benefitPill}>
                  <Text style={styles.benefitText}>{t(`myWelfare.benefit_${b}`)}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Text style={styles.sectionTitle}>{t("myWelfare.transactionHistory")}</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState icon={icons.welfare} title={t("myWelfare.noTransactions")} />}
      renderItem={({ item }) => (
        <View style={styles.txRow}>
          <View style={styles.txInfo}>
            <Text style={styles.txType}>{item.type}</Text>
            <Text style={styles.txDate}>{formatDate(item.createdAt, i18n.language)}</Text>
          </View>
          <Text style={styles.txAmount}>+{formatCurrency(item.amount, i18n.language)}</Text>
        </View>
      )}
    />
  );
}

function InsuranceStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.insuranceStat}>
      <Text style={styles.insuranceStatValue}>{value}</Text>
      <Text style={styles.insuranceStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary },
  tagline: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  insuranceCard: { marginTop: spacing.md },
  insuranceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  insuranceTitle: { ...type.h3, color: colors.textPrimary },
  insuranceActive: { ...type.smallMedium, color: colors.success },
  insuranceRow: { flexDirection: "row", marginTop: spacing.lg, gap: spacing.xl },
  insuranceStat: {},
  insuranceStatValue: { ...type.h2, color: colors.textPrimary },
  insuranceStatLabel: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  insuranceProvider: { ...type.small, color: colors.textSecondary, marginTop: spacing.lg },
  insuranceDemoNote: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs, fontStyle: "italic" },
  benefitsCard: { marginTop: spacing.lg },
  sectionTitle: { ...type.h3, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.xl },
  benefitsGrid: { flexDirection: "row", flexWrap: "wrap" },
  benefitPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  benefitText: { ...type.caption, color: colors.primaryDark },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txInfo: { flexShrink: 1 },
  txType: { ...type.bodyMedium, color: colors.textPrimary, textTransform: "capitalize" },
  txDate: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  txAmount: { ...type.bodyMedium, color: colors.success, flexShrink: 0 },
});
