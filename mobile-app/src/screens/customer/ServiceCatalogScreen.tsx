import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { useTabSwitch } from "../../navigation/TabSwitchContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { getServices } from "../../api/services";
import type { Service } from "../../api/types";
import { formatCurrency } from "../../lib/format";
import { iconForCategory } from "../../lib/categoryIcons";
import { useAuth } from "../../store/AuthContext";
import { useServiceLocation } from "../../store/LocationContext";
import { Card, Chip, ErrorState, LoadingState, ServiceCard } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<HomeStackParamList, "ServiceCatalog">;

const WHY_CHOOSE_US = [
  { icon: "✅", title: "Verified Professionals", body: "Every worker is federation-checked." },
  { icon: "⚖️", title: "Fair Worker Earnings", body: "No hidden platform commission." },
  { icon: "🔍", title: "Transparent Pricing", body: "See the exact split before you pay." },
  { icon: "🤝", title: "Worker Welfare", body: "Every job funds the safety net." },
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

  // Dispatch model (§8-9) — tapping a service goes straight to
  // scheduling; there is no "choose your professional" step, the system
  // finds one automatically after booking.
  function openService(service: Service) {
    navigation.navigate("BookingSlot", {
      serviceId: service.id,
      serviceName: service.name,
    });
  }

  if (!location || loading) return <LoadingState />;
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
            <View>
              <Text style={styles.greeting}>Hi {user?.name?.split(" ")[0] ?? "there"} 👋</Text>
              <Text style={styles.subGreeting}>What do you need help with?</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => navigation.navigate("LocationPicker")}
          >
            <Text style={styles.locationIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>Service location</Text>
              <Text style={styles.locationValue} numberOfLines={1}>
                {location.label}
                {location.line1 ? ` — ${location.line1}` : ""}
              </Text>
            </View>
            <Text style={styles.locationChange}>Change</Text>
          </TouchableOpacity>

          <View style={styles.switcher}>
            <LanguageSwitcher persist />
          </View>

          <TextInput
            style={styles.search}
            placeholder="Search e.g. plumber, cleaning, electrician"
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
              <Text style={styles.emergencyTitle}>🚨 Need help right now?</Text>
              <Text style={styles.emergencyBody}>
                Book Emergency Service — the +20% urgency amount goes entirely to
                your worker.
              </Text>
            </View>
          </TouchableOpacity>

          {categories.length > 0 && (
            <View style={styles.categoryRow}>
              <Chip label="All" selected={!category} onPress={() => setCategory(null)} />
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

          <Text style={styles.sectionTitle}>Services</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View>
          <ServiceCard
            icon={iconForCategory(item.category)}
            name={item.name}
            category={item.category}
            priceLabel={`${formatCurrency(item.basePrice, i18n.language)} onwards`}
            onPress={() => openService(item)}
          />
          {item.coverage === false && (
            <Text style={styles.noCoverage}>Not yet available near {location.label}</Text>
          )}
        </View>
      )}
      ListFooterComponent={
        <View>
          <Text style={styles.sectionTitle}>Why choose us</Text>
          <View style={styles.whyGrid}>
            {WHY_CHOOSE_US.map((w) => (
              <Card key={w.title} style={styles.whyCard} elevated={false}>
                <Text style={styles.whyIcon}>{w.icon}</Text>
                <Text style={styles.whyTitle}>{w.title}</Text>
                <Text style={styles.whyBody}>{w.body}</Text>
              </Card>
            ))}
          </View>

          <Card style={styles.impactCard}>
            <Text style={styles.impactTitle}>Cooperative impact</Text>
            <View style={styles.impactRow}>
              <ImpactStat value="1,248" label="workers supported" />
              <ImpactStat value="₹8.4L" label="welfare contributed" />
              <ImpactStat value="18,420" label="services completed" />
            </View>
          </Card>
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
  list: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  headerRow: { marginBottom: spacing.md },
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
  locationIcon: { fontSize: 18, marginRight: spacing.sm },
  locationLabel: { ...type.caption, color: colors.textMuted },
  locationValue: { ...type.smallMedium, color: colors.textPrimary, marginTop: 1 },
  locationChange: { ...type.smallMedium, color: colors.primary },
  switcher: { marginVertical: spacing.lg, alignItems: "flex-start" },
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
  whyIcon: { fontSize: 22, marginBottom: spacing.xs },
  whyTitle: { ...type.smallMedium, color: colors.primaryDark },
  whyBody: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  impactCard: { marginTop: spacing.md, backgroundColor: colors.primaryDark, borderWidth: 0 },
  impactTitle: { ...type.smallMedium, color: colors.primaryLight, marginBottom: spacing.md },
  impactRow: { flexDirection: "row", justifyContent: "space-between" },
  impactStat: { alignItems: "center", flex: 1 },
  impactValue: { ...type.h2, color: colors.textInverse },
  impactLabel: { ...type.caption, color: colors.primaryLight, marginTop: 2, textAlign: "center" },
});
