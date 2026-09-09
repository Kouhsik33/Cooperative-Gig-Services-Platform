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
import { colors, spacing, type } from "../../theme/tokens";
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
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{t("home.greeting", { name: user?.name?.split(" ")[0] ?? "" })}</Text>
              <Text style={styles.subGreeting}>{t("home.prompt")}</Text>
            </View>
            <NotificationBell onPress={() => navigation.navigate("Notifications")} />
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

          <View style={styles.switcher}>
            <LanguageSwitcher persist />
          </View>

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
                  label={`${iconForCategory(c)} ${c}`}
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
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 12 },
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
  greeting: { ...type.h1, color: colors.textPrimary },
  subGreeting: { ...type.body, color: colors.textSecondary, marginTop: 2 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  locationIcon: { marginRight: spacing.sm },
  locationLabel: { ...type.caption, color: colors.textMuted },
  locationValue: { ...type.smallMedium, color: colors.textPrimary, marginTop: 1 },
  locationChange: { ...type.smallMedium, color: colors.primary },
  switcher: { marginVertical: spacing.lg, alignItems: "flex-start" },
  activeCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  activeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activeLabel: { ...type.caption, color: colors.primaryDark },
  activeService: { ...type.h3, color: colors.textPrimary, marginTop: spacing.xs },
  activeMeta: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  activeCta: { ...type.smallMedium, color: colors.primary, marginTop: spacing.md },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    color: colors.textPrimary,
    ...type.body,
  },
  emergencyCard: {
    backgroundColor: colors.errorLight,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.error,
  },
  emergencyTitle: { ...type.h3, color: colors.error },
  emergencyBody: { ...type.small, color: colors.error, marginTop: spacing.xs },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
  sectionTitle: { ...type.h3, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.sm },
  noCoverage: { ...type.caption, color: colors.warning, marginTop: -spacing.sm, marginBottom: spacing.md },
  whyGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  whyCard: {
    width: "48%",
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.md,
  },
  whyIcon: { marginBottom: spacing.xs },
  whyTitle: { ...type.smallMedium, color: colors.primaryDark },
  whyBody: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  impactCard: { marginTop: spacing.md, backgroundColor: colors.primaryDark, borderWidth: 0 },
  impactTitle: { ...type.smallMedium, color: colors.primaryLight, marginBottom: spacing.md },
  impactRow: { flexDirection: "row", justifyContent: "space-between" },
  impactFooter: {
    ...type.caption,
    color: colors.primaryLight,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  impactStat: { alignItems: "center", flex: 1 },
  impactValue: { ...type.h2, color: colors.textInverse },
  impactLabel: { ...type.caption, color: colors.primaryLight, marginTop: 2, textAlign: "center" },
});
