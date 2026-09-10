import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { useTabSwitch } from "../../navigation/TabSwitchContext";
import { useBookingSync } from "../../lib/useBookingSync";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import NotificationBell from "../../components/NotificationBell";
import { getServices } from "../../api/services";
import { listMyBookings } from "../../api/bookings";
import { getCooperativeImpact } from "../../api/impact";
import type { CooperativeImpact } from "../../api/impact";
import type { Booking, BookingStatus, Service } from "../../api/types";
import { formatCompact, formatCompactCurrency, formatCurrency } from "../../lib/format";
import { iconForCategory } from "../../lib/categoryIcons";
import { useAuth } from "../../store/AuthContext";
import { useServiceLocation } from "../../store/LocationContext";
import { Card, Chip, ErrorState, ServiceCard, SkeletonList, StatusBadge } from "../../components/ui";
import { borders, colors, radius, shadow, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

type Props = NativeStackScreenProps<HomeStackParamList, "ServiceCatalog">;

// Everything from "we're searching" through to "awaiting your completion
// code" — i.e. a booking the customer may still need to act on.
const ACTIVE_STATUSES: BookingStatus[] = [
  "REQUESTED",
  "ASSIGNED",
  "ON_THE_WAY",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
];

const WHY_CHOOSE_US = [
  { icon: icons.verified, key: "Verified" },
  { icon: icons.fairWage, key: "Fair" },
  { icon: icons.search, key: "Transparent" },
  { icon: icons.welfare, key: "Welfare" },
];

// Customer Home tab (master prompt §8, product-flow update §10-12) —
// "What do you need help with?" answered immediately, and now
// location-first: services are fetched with the selected service
// location's coordinates, so changing location genuinely refreshes
// coverage (a service with zero nearby verified workers is shown but
// clearly tagged, never silently hidden or faked as available).
export default function ServiceCatalogScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const switchTab = useTabSwitch();
  const { location } = useServiceLocation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [impact, setImpact] = useState<CooperativeImpact | null>(null);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  function load() {
    if (!location) return;
    setLoading(true);
    getServices(location.latitude, location.longitude)
      .then((data) => {
        setServices(data);
        setError(null);
      })
      .catch(() => setError(t("customer.loadError")))
      .finally(() => setLoading(false));
  }

  // Re-fetches whenever the selected service location changes — the
  // whole point of product-flow update §10 ("location change must
  // refresh services").
  useEffect(load, [location?.latitude, location?.longitude]);

  // Location-independent, so it loads once. A failure here must not take
  // the catalog down with it — the impact card simply stays hidden.
  useEffect(() => {
    getCooperativeImpact()
      .then(setImpact)
      .catch(() => setImpact(null));
  }, []);

  // A booking already in flight is the most actionable thing a returning
  // customer can see, so home surfaces it above the catalog. Kept in
  // sync on focus + every booking lifecycle socket event, so it appears
  // the moment one is placed and disappears when it completes/cancels —
  // never a stale card. Failure is silent (must not take the catalog
  // down), same as the impact card.
  const loadActiveBooking = useCallback(() => {
    listMyBookings()
      .then((all) => setActiveBooking(all.find((b) => ACTIVE_STATUSES.includes(b.status)) ?? null))
      .catch(() => setActiveBooking(null));
  }, []);
  useBookingSync(loadActiveBooking);

  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.category))),
    [services]
  );

  const filtered = services.filter((s) => {
    const matchesQuery =
      !query || s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !category || s.category === category;
    return matchesQuery && matchesCategory;
  });

  // Tapping a service opens its detail page first (§12) — what's
  // included, how long it takes, what people thought — and the customer
  // books from there. Still no "choose your professional" step: the
  // dispatch engine picks the worker after the booking is placed (§8-9).
  function openService(service: Service) {
    navigation.navigate("ServiceDetail", {
      serviceId: service.id,
      serviceName: service.name,
    });
  }

  if (!location || loading) return <SkeletonList count={5} variant="card" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={filtered}
      keyExtractor={(item) => item.id}
      numColumns={1}
      ListHeaderComponent={
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>SAHAKARYA</Text>
            <View style={styles.brandPill}>
              <Text style={styles.brandPillText}>COOPERATIVE</Text>
            </View>
          </View>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{t("home.greeting", { name: user?.name?.split(" ")[0] ?? "" })}</Text>
              <Text style={styles.subGreeting}>{t("home.prompt")}</Text>
            </View>
            <NotificationBell onPress={() => navigation.navigate("Notifications")} />
          </View>

          <View style={styles.switcher}>
            <LanguageSwitcher persist />
          </View>

          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => navigation.navigate("LocationPicker")}
          >
            <Ionicons name={icons.location} size={iconSize.md} color={colors.primary} style={styles.locationIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>{t("home.serviceLocation")}</Text>
              <Text style={styles.locationValue} numberOfLines={1}>
                {location.label}
                {location.line1 ? ` — ${location.line1}` : ""}
              </Text>
            </View>
            <Text style={styles.locationChange}>{t("home.change")}</Text>
          </TouchableOpacity>

          {activeBooking && (
            <TouchableOpacity
              style={styles.activeCard}
              onPress={() =>
                navigation.navigate("BookingTracking", { bookingId: activeBooking.id })
              }
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <View style={styles.activeHeader}>
                <Text style={styles.activeLabel}>{t("home.activeBooking")}</Text>
                <StatusBadge status={activeBooking.status} />
              </View>
              <Text style={styles.activeService}>{activeBooking.service.name}</Text>
              <Text style={styles.activeMeta}>
                {activeBooking.worker
                  ? activeBooking.worker.user.name
                  : t("bookings.findingProfessional")}
              </Text>
              <View style={styles.ctaRow}>
              <Text style={styles.activeCta}>{t("home.trackNow")}</Text>
              <Ionicons name={icons.chevron} size={iconSize.sm} color={colors.primary} />
            </View>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.search}
            placeholder={t("home.searchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />

          <TouchableOpacity
            style={styles.emergencyCard}
            onPress={() => switchTab("emergency")}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>{t("home.emergencyTitle")}</Text>
<Text style={styles.emergencyBody}>{t("home.emergencyBody")}</Text>
            </View>
          </TouchableOpacity>

          {categories.length > 0 && (
            <View style={styles.categoryRow}>
              <Chip label={t("home.all")} selected={!category} onPress={() => setCategory(null)} />
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  icon={iconForCategory(c)}
                  selected={category === c}
                  onPress={() => setCategory(c)}
                />
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>{t("home.services")}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ServiceCard
          icon={iconForCategory(item.category)}
          name={item.name}
          category={item.category}
          priceLabel={t("home.onwards", { price: formatCurrency(item.basePrice, i18n.language) })}
          ratingAvg={item.ratingAvg}
          ratingCount={item.ratingCount}
          completedCount={item.completedCount}
          durationLabel={
            item.durationMinMinutes && item.durationMaxMinutes
              ? t("home.minutes", { min: item.durationMinMinutes, max: item.durationMaxMinutes })
              : null
          }
          trustLabel={t("home.trustShort")}
          unavailableLabel={
            item.coverage === false ? t("home.notAvailableNear", { area: location.label }) : null
          }
          onPress={() => openService(item)}
        />
      )}
      ListFooterComponent={
        <View>
          <Text style={styles.sectionTitle}>{t("home.whyChooseUs")}</Text>
          <View style={styles.whyGrid}>
            {WHY_CHOOSE_US.map((w) => (
              <Card key={w.key} style={styles.whyCard} elevated={false}>
                <Ionicons name={w.icon} size={iconSize.md} color={colors.primaryDark} style={styles.whyIcon} />
                <Text style={styles.whyTitle}>{t(`home.why${w.key}Title`)}</Text>
                <Text style={styles.whyBody}>{t(`home.why${w.key}Body`)}</Text>
              </Card>
            ))}
          </View>

          {/* Real aggregates from GET /impact. Rendered only once the
              numbers have actually arrived — an impact claim is worth
              nothing if it can show a placeholder. */}
          {impact && (
            <Card style={styles.impactCard}>
              <Text style={styles.impactTitle}>{t("home.impactTitle")}</Text>
              <View style={styles.impactRow}>
                <ImpactStat
                  value={formatCompact(impact.verifiedWorkers)}
                  label={t("home.impactWorkers")}
                />
                <ImpactStat
                  value={formatCompactCurrency(impact.welfareGenerated)}
                  label={t("home.impactWelfare")}
                />
                <ImpactStat
                  value={formatCompact(impact.completedServices)}
                  label={t("home.impactServices")}
                />
              </View>
              {impact.avgWorkerSharePercent != null && (
                <Text style={styles.impactFooter}>
                  {t("home.impactShare", { percent: impact.avgWorkerSharePercent })}
                </Text>
              )}
            </Card>
          )}
        </View>
      }
    />
  );
}

function ImpactStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.impactStat}>
      <Text style={styles.impactValue}>{value}</Text>
      <Text style={styles.impactLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs },
  brandName: { ...type.caption, fontWeight: "900", color: colors.primary, letterSpacing: 1.2 },
  brandPill: {
    backgroundColor: colors.goldLight,
    borderWidth: borders.thin,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  brandPillText: { ...type.caption, fontSize: 9, fontWeight: "800", color: colors.goldDark },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl + 40, backgroundColor: colors.background },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
  greeting: { ...type.h1, fontWeight: "900", color: colors.textPrimary },
  subGreeting: { ...type.body, fontWeight: "600", color: colors.textSecondary, marginTop: 2 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: borders.color,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.sm,
  },
  locationIcon: { marginRight: spacing.sm },
  locationLabel: { ...type.caption, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase" },
  locationValue: { ...type.smallMedium, fontWeight: "800", color: colors.textPrimary, marginTop: 1 },
  locationChange: {
    ...type.caption,
    fontWeight: "800",
    color: colors.textPrimary,
    backgroundColor: colors.skyLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: borders.thin,
    borderColor: borders.color,
  },
  switcher: { marginVertical: spacing.md, alignItems: "flex-start" },
  activeCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    borderWidth: borders.default,
    borderColor: colors.primary,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.md,
  },
  activeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activeLabel: {
    ...type.caption,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeService: { ...type.h2, fontWeight: "900", color: colors.textPrimary, marginTop: spacing.xs },
  activeMeta: { ...type.small, fontWeight: "600", color: colors.textPrimary, marginTop: 2 },
  activeCta: {
    ...type.smallMedium,
    fontWeight: "800",
    color: colors.primary,
    textDecorationLine: "underline",
  },
  search: {
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: borders.color,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    color: colors.textPrimary,
    ...type.bodyMedium,
    fontWeight: "600",
    ...shadow.sm,
  },
  emergencyCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: borders.default,
    borderColor: borders.color,
    ...shadow.sm,
  },
  emergencyTitle: { ...type.h3, fontWeight: "900", color: colors.error },
  emergencyBody: { ...type.small, fontWeight: "600", color: colors.textPrimary, marginTop: spacing.xs },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
  sectionTitle: {
    ...type.h3,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  noCoverage: { ...type.caption, fontWeight: "700", color: colors.warning, marginTop: -spacing.sm, marginBottom: spacing.md },
  whyGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  whyCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: borders.color,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  whyIcon: { marginBottom: spacing.xs },
  whyTitle: { ...type.smallMedium, fontWeight: "800", color: colors.textPrimary },
  whyBody: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  impactCard: {
    marginTop: spacing.md,
    backgroundColor: colors.goldLight,
    borderRadius: radius.xl,
    borderWidth: borders.default,
    borderColor: borders.color,
    ...shadow.md,
  },
  impactTitle: {
    ...type.smallMedium,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  impactRow: { flexDirection: "row", justifyContent: "space-between" },
  impactFooter: {
    ...type.caption,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  impactStat: { alignItems: "center", flex: 1 },
  impactValue: { ...type.h2, fontWeight: "900", color: colors.textPrimary },
  impactLabel: { ...type.caption, fontWeight: "700", color: colors.textSecondary, marginTop: 2, textAlign: "center" },
});
