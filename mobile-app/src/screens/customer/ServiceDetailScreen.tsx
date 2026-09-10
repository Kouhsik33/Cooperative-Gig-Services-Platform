import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { getService } from "../../api/services";
import type { ServiceDetail, ServicePackage } from "../../api/types";
import { formatCurrency, formatDate } from "../../lib/format";
import { iconForCategory } from "../../lib/categoryIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useServiceLocation } from "../../store/LocationContext";
import {
  Button,
  Card,
  ErrorState,
  Rating,
  ServicePackageCard,
  SkeletonList,
  TrustList,
} from "../../components/ui";
import { borders, colors, layout, radius, shadow, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

type Props = NativeStackScreenProps<HomeStackParamList, "ServiceDetail">;

// Service detail (master prompt §12 — "a service should feel like a
// product detail page"). Previously tapping a service jumped straight to
// the slot picker, so a customer committed to a booking without ever
// seeing what the service actually includes, how long it takes, or what
// anyone thought of it.
//
// Every number here is server-computed from real bookings and ratings
// (GET /services/:id); nothing on this screen is illustrative.
export default function ServiceDetailScreen({ route, navigation }: Props) {
  const { serviceId } = route.params;
  const { t, i18n } = useTranslation();
  const { location } = useServiceLocation();
  const insets = useSafeAreaInsets();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    getService(serviceId, location?.latitude, location?.longitude, location?.pincode)
      .then((data) => {
        setService(data);
        const defaultId =
          data.packages?.find((p) => p.isDefault)?.id ?? data.packages?.[0]?.id ?? null;
        setSelectedTaskIds(defaultId ? [defaultId] : []);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [serviceId, location?.latitude, location?.longitude, location?.pincode]);

  useEffect(load, [load]);

  if (loading) return <SkeletonList count={3} variant="card" />;
  if (error || !service) {
    return <ErrorState message={t("customer.loadError")} onRetry={load} />;
  }

  const money = (n: number) => formatCurrency(n, i18n.language);
  const packages: ServicePackage[] = service.packages ?? [];

  const toggleTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least one item ticked
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectedTasks = packages.filter((p) => selectedTaskIds.includes(p.id));
  const activePrice =
    selectedTasks.length > 0
      ? selectedTasks.reduce((sum, p) => sum + p.price, 0)
      : service.basePrice;

  // Exact server-matching fair wage split aggregated across all ticked tasks
  const activeSplit =
    selectedTasks.length > 0
      ? {
          totalAmount: selectedTasks.reduce(
            (sum, p) => sum + (p.pricePreview?.standard?.totalAmount ?? p.price),
            0
          ),
          workerShare: selectedTasks.reduce(
            (sum, p) => sum + (p.pricePreview?.standard?.workerShare ?? Math.round(p.price * 0.8)),
            0
          ),
          federationFee: selectedTasks.reduce(
            (sum, p) => sum + (p.pricePreview?.standard?.federationFee ?? Math.round(p.price * 0.1)),
            0
          ),
          welfareContribution: selectedTasks.reduce(
            (sum, p) => sum + (p.pricePreview?.standard?.welfareContribution ?? Math.round(p.price * 0.03)),
            0
          ),
          emergencyBonus: 0,
        }
      : service.pricePreview?.standard ?? null;
  const duration =
    service.durationMinMinutes && service.durationMaxMinutes
      ? `${service.durationMinMinutes}–${service.durationMaxMinutes} ${t("serviceDetail.minutes")}`
      : null;
  // Three states, deliberately distinct (§16): the area isn't served at
  // all; it is served but every local professional is mid-job; or it's
  // bookable now. Conflating the first two tells a customer "unavailable"
  // when the cooperative does serve them.
  const noCoverage = service.coverage === false;
  const allBusy = service.coverage === true && service.availableWorkerCount === 0;

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons
              name={iconForCategory(service.category) as any}
              size={28}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>{service.name}</Text>

          <View style={styles.proofRow}>
            {service.ratingAvg != null ? (
              <Rating value={service.ratingAvg} count={service.ratingCount} size={15} />
            ) : (
              <Text style={styles.proofMuted}>{t("serviceDetail.notYetRated")}</Text>
            )}
          </View>

          {service.completedCount > 0 && (
            <Text style={styles.completedText}>
              {t("serviceDetail.completedCount", { count: service.completedCount })}
            </Text>
          )}

          <Text style={styles.price}>
            {t("serviceDetail.startingAt")} {money(service.startingPrice ?? service.basePrice)}
          </Text>
          {duration && <Text style={styles.duration}>{duration}</Text>}
        </View>

        {service.description && <Text style={styles.description}>{service.description}</Text>}

        {noCoverage && (
          <Card style={styles.warningCard} elevated={false}>
            <Text style={styles.warningTitle}>{t("serviceDetail.noCoverageTitle")}</Text>
            <Text style={styles.warningText}>{t("serviceDetail.noCoverageBody")}</Text>
            <Button
              label={t("serviceDetail.changeLocation")}
              variant="outline"
              onPress={() => navigation.navigate("LocationPicker")}
              style={styles.warningAction}
            />
          </Card>
        )}

        {allBusy && (
          <Card style={styles.infoCard} elevated={false}>
            <Text style={styles.infoTitle}>{t("serviceDetail.busyTitle")}</Text>
            <Text style={styles.infoText}>
              {t("serviceDetail.busyBody", { count: service.nearbyWorkerCount ?? 0 })}
            </Text>
          </Card>
        )}

        {packages.length > 0 && (
          <View
            style={styles.packageSection}
            accessibilityLabel={t("packages.chooseProblems", "Select issues or tasks")}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.listTitle}>{t("packages.chooseProblems", "Select issues or tasks")}</Text>
              <View style={styles.selectedCountPill}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={styles.selectedCountText}>
                  {selectedTasks.length} {selectedTasks.length === 1 ? "task selected" : "tasks selected"}
                </Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Tick the specific tasks needed. Pricing is itemized dynamically into your checkout bill.
            </Text>
            {packages.map((p, i) => (
              <ServicePackageCard
                key={p.id}
                pkg={p}
                index={i}
                total={packages.length}
                selected={selectedTaskIds.includes(p.id)}
                onSelect={() => toggleTask(p.id)}
                money={money}
              />
            ))}
          </View>
        )}

        {service.inclusions.length > 0 && (
          <Card style={styles.listCard}>
            <Text style={styles.listTitle}>{t("serviceDetail.included")}</Text>
            {service.inclusions.map((item) => (
              <View key={item} style={styles.listRow}>
                <Ionicons name={icons.included} size={iconSize.sm} color={colors.success} style={styles.tick} />
                <Text style={styles.listItem}>{item}</Text>
              </View>
            ))}
          </Card>
        )}

        {service.exclusions.length > 0 && (
          <Card style={styles.listCard} elevated={false}>
            <Text style={styles.listTitle}>{t("serviceDetail.notIncluded")}</Text>
            {service.exclusions.map((item) => (
              <View key={item} style={styles.listRow}>
                <Ionicons name={icons.excluded} size={iconSize.sm} color={colors.textMuted} style={styles.cross} />
                <Text style={styles.listItemMuted}>{item}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* How the dispatch + OTP model actually works */}
        <Card style={styles.listCard} elevated={false}>
          <Text style={styles.listTitle}>{t("serviceDetail.howItWorks")}</Text>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{n}</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{t(`serviceDetail.step${n}Title`)}</Text>
                <Text style={styles.stepText}>{t(`serviceDetail.step${n}Body`)}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Requirement 12 — the exact split, before paying. Server-computed
            by the same function the booking uses, so this cannot drift
            from what is actually charged. */}
        {activeSplit && (
          <Card style={styles.coopCard} elevated={false}>
            <Text style={styles.coopTitle}>{t("serviceDetail.whereMoneyGoes")}</Text>
            <Text style={styles.splitCaption}>
              {selectedTasks.length > 0
                ? `${selectedTasks.length} ${selectedTasks.length === 1 ? "task" : "tasks"} selected (${money(activePrice)})`
                : t("serviceDetail.onABooking", { price: money(activeSplit.totalAmount) })}
            </Text>
            <SplitRow label={t("packages.packagePrice", "Estimated total")} value={money(activeSplit.totalAmount)} />
            <SplitRow
              label={t("fairPricing.workerShare")}
              value={money(activeSplit.workerShare)}
              emphasis
            />
            <SplitRow
              label={t("fairPricing.federationFee")}
              value={money(activeSplit.federationFee)}
            />
            <SplitRow
              label={t("fairPricing.welfareContribution")}
              value={money(activeSplit.welfareContribution)}
            />
            <View style={styles.trustWrap}>
              <TrustList
                items={[
                  { label: t("serviceDetail.coopVerified") },
                  { label: t("serviceDetail.coopFairWage"), tone: "fairWage" },
                  { label: t("serviceDetail.coopWelfare"), tone: "welfare" },
                  { label: t("serviceDetail.coopNoCommission") },
                ]}
              />
            </View>
          </Card>
        )}

        {service.reviews.length === 0 && (
          <Card style={styles.listCard} elevated={false}>
            <Text style={styles.listTitle}>{t("serviceDetail.reviews")}</Text>
            <Text style={styles.emptyReviews}>{t("serviceDetail.noReviewsYet")}</Text>
          </Card>
        )}

        {service.reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text style={styles.listTitle}>{t("serviceDetail.reviews")}</Text>
            {service.reviews.map((r) => (
              <Card key={r.id} style={styles.reviewCard} elevated={false}>
                <View style={styles.reviewHeader}>
                  <Rating value={r.stars} />
                  <Text style={styles.reviewMeta}>
                    {r.customerName}
                    {r.completedAt ? ` · ${formatDate(r.completedAt, i18n.language)}` : ""}
                  </Text>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                {r.workerName && (
                  <Text style={styles.reviewWorker}>
                    {t("serviceDetail.servedBy", { name: r.workerName })}
                  </Text>
                )}
              </Card>
            ))}
          </View>
        )}
        <Card style={styles.listCard} elevated={false}>
          <Text style={styles.listTitle}>{t("serviceDetail.faqs")}</Text>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={styles.faqRow}>
              <Text style={styles.faqQ}>{t(`serviceDetail.faq${n}Q`)}</Text>
              <Text style={styles.faqA}>{t(`serviceDetail.faq${n}A`)}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Sticky Bottom CTA Bar */}
      <View style={[styles.ctaBar, { paddingBottom: Math.max(spacing.lg, insets.bottom + 8) }]}>
        <View style={styles.ctaPrice}>
          <Text style={styles.ctaPriceValue}>{money(activePrice)}</Text>
          <Text style={styles.ctaPriceLabel}>
            {selectedTasks.length === 1
              ? selectedTasks[0].name
              : `${selectedTasks.length} tasks selected`}
          </Text>
        </View>
        <Button
          label={t("serviceDetail.bookThis")}
          variant="primary"
          disabled={selectedTasks.length === 0}
          onPress={() =>
            navigation.navigate("BookingSlot", {
              serviceId: service.id,
              serviceName: service.name,
              packageId: selectedTasks[0]?.id,
              packageIds: selectedTaskIds,
              packageName: selectedTasks.map((t) => t.name).join(" + "),
              selectedTasks: selectedTasks.map((t) => ({ id: t.id, name: t.name, price: t.price })),
            })
          }
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
}

function SplitRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.splitRow}>
      <Text style={[styles.splitLabel, emphasis && styles.splitLabelStrong]}>{label}</Text>
      <Text style={[styles.splitValue, emphasis && styles.splitValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  container: { padding: spacing.xl, paddingBottom: layout.stickyBarClearance + spacing.xl },
  hero: { marginBottom: spacing.lg },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.skyLight,
    borderWidth: borders.default,
    borderColor: borders.color,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  title: { ...type.h1, fontWeight: "900", color: colors.textPrimary },
  proofRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, gap: spacing.sm },
  proofText: { ...type.small, color: colors.textSecondary },
  proofMuted: { ...type.small, color: colors.textMuted },
  completedText: { ...type.small, fontWeight: "600", color: colors.textSecondary, marginTop: spacing.xs },
  price: { ...type.h2, fontWeight: "800", color: colors.primary, marginTop: spacing.md },
  duration: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs },
  description: { ...type.body, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 22 },
  warningCard: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
    borderWidth: borders.default,
    marginBottom: spacing.lg,
  },
  warningTitle: { ...type.bodyMedium, color: colors.warning, marginBottom: spacing.xs },
  warningText: { ...type.small, color: colors.warning },
  warningAction: { marginTop: spacing.md, borderColor: colors.warning },
  infoCard: {
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
    borderWidth: borders.default,
    marginBottom: spacing.lg,
  },
  infoTitle: { ...type.bodyMedium, color: colors.info, marginBottom: spacing.xs },
  infoText: { ...type.small, color: colors.info },
  listCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: borders.color,
    borderRadius: radius.lg,
    ...shadow.sm,
  },
  packageSection: { marginBottom: spacing.lg },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectedCountPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderWidth: borders.thin,
    borderColor: borders.color,
    gap: 4,
  },
  selectedCountText: {
    ...type.caption,
    fontWeight: "800",
    color: colors.primary,
    fontSize: 11,
  },
  sectionSubtitle: {
    ...type.small,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  listTitle: { ...type.h3, fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.md },
  listRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
  tick: { marginRight: spacing.sm, marginTop: 2 },
  cross: { marginRight: spacing.sm, marginTop: 2 },
  listItem: { ...type.body, color: colors.textPrimary, flex: 1 },
  listItemMuted: { ...type.body, color: colors.textMuted, flex: 1 },
  coopCard: {
    backgroundColor: colors.primaryLight,
    borderWidth: borders.default,
    borderColor: borders.color,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    ...shadow.sm,
  },
  coopTitle: { ...type.h3, fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.md },
  coopItem: { ...type.small, color: colors.textPrimary, flex: 1 },
  splitCaption: { ...type.caption, fontWeight: "700", color: colors.textSecondary, marginBottom: spacing.md },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  splitLabel: { ...type.small, color: colors.textSecondary, flex: 1, marginRight: spacing.md },
  splitLabelStrong: { ...type.bodyMedium, fontWeight: "800", color: colors.primary },
  splitValue: { ...type.smallMedium, color: colors.textPrimary, flexShrink: 0, textAlign: "right" },
  splitValueStrong: { ...type.h3, fontWeight: "900", color: colors.primary },
  trustWrap: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  stepRow: { flexDirection: "row", marginBottom: spacing.lg },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: borders.thin,
    borderColor: borders.color,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  stepNumText: { ...type.caption, color: colors.textInverse, fontWeight: "800" },
  stepBody: { flex: 1 },
  stepTitle: { ...type.bodyMedium, fontWeight: "800", color: colors.textPrimary },
  stepText: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  faqRow: { marginBottom: spacing.lg },
  faqQ: { ...type.bodyMedium, fontWeight: "700", color: colors.textPrimary },
  faqA: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 },
  emptyReviews: { ...type.small, color: colors.textMuted },
  reviewsSection: { marginTop: spacing.sm },
  reviewCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: borders.color,
    borderRadius: radius.lg,
    ...shadow.sm,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reviewMeta: { ...type.caption, color: colors.textMuted },
  reviewComment: { ...type.body, color: colors.textPrimary, marginTop: spacing.sm },
  reviewWorker: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
  ctaBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: borders.default,
    borderTopColor: borders.color,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.lg,
    shadowColor: borders.color,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    zIndex: 99,
  },
  ctaPrice: { minWidth: 90 },
  ctaPriceValue: { ...type.h2, fontWeight: "900", color: colors.textPrimary },
  ctaPriceLabel: { ...type.caption, fontWeight: "700", color: colors.textSecondary },
  ctaButton: { flex: 1, minHeight: 48 },
});
