import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { EmergencyStackParamList } from "../../navigation/CustomerNavigator";
import { apiClient } from "../../api/client";
import type { Service } from "../../api/types";
import { useServiceLocation } from "../../store/LocationContext";
import { iconForCategory } from "../../lib/categoryIcons";
import { ErrorState, LoadingState } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

type Props = NativeStackScreenProps<EmergencyStackParamList, "EmergencyBooking">;

// Customer journey step 3 (Part B) — Requirement 8. Visually distinct
// "Emergency" / "Book Now" flow: pick a service and go straight to the
// Fair Pricing Breakdown with the emergency surge applied (Part F).
// Dispatch model (§25) — no manual worker lookup here anymore; creating
// the booking broadcasts it to every eligible AVAILABLE worker the same
// way a normal booking does, just flagged isEmergency so the surge
// applies and the request shows as urgent on their end. Matches against
// the customer's selected service location (product-flow update §29 —
// "confirm location" is shown, not silently assumed).
export default function EmergencyBookingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { location } = useServiceLocation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiClient
      .get<Service[]>("/services")
      .then((res) => {
        setServices(res.data);
        setError(null);
      })
      .catch(() => setError(t("emergency.loadError")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function bookNow(service: Service) {
    if (!location) return;
    navigation.navigate("FairPricingBreakdown", {
      serviceId: service.id,
      scheduledAt: new Date().toISOString(),
      latitude: location.latitude,
      longitude: location.longitude,
      isEmergency: true,
      serviceAddressLine: location.line1,
      serviceLandmark: location.landmark,
      servicePincode: location.pincode,
      contactName: location.contactName,
      contactPhone: location.contactPhone,
    });
  }

  if (loading || !location) return <LoadingState />;

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Ionicons name={icons.emergency} size={iconSize.xl} color={colors.textInverse} style={styles.heroIcon} />
        <Text style={styles.title}>{t("emergency.title")}</Text>
        <Text style={styles.subtitle}>{t("emergency.subtitle")}</Text>
        <View style={styles.trustRow}>
          <Text style={styles.trustText}>
            +20% emergency worker incentive — 100% of it goes to the worker.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.locationRow} onPress={() => navigation.navigate("LocationPicker")}>
        <Ionicons name={icons.location} size={iconSize.md} color={colors.textInverse} style={styles.locationIcon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationLabel}>{t("customer.confirmLocation")}</Text>
          <Text style={styles.locationValue}>{location.label} — {location.line1}</Text>
        </View>
        <Text style={styles.locationChange}>Change</Text>
      </TouchableOpacity>

      {error && <ErrorState message={error} />}

      <Text style={styles.sectionTitle}>{t("customer.selectService")}</Text>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.serviceButton}
            onPress={() => bookNow(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.serviceIcon}>{iconForCategory(item.category)}</Text>
            <Text style={styles.serviceButtonText}>{item.name}</Text>
            <Text style={styles.serviceButtonAction}>{t("emergency.bookNow")}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl },
  heroCard: {
    backgroundColor: colors.error,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  heroIcon: { fontSize: 36, marginBottom: spacing.sm },
  title: { ...type.h1, color: colors.textInverse, textAlign: "center" },
  subtitle: {
    ...type.body,
    color: colors.textInverse,
    textAlign: "center",
    marginTop: spacing.xs,
    opacity: 0.9,
  },
  trustRow: {
    marginTop: spacing.lg,
    backgroundColor: colors.overlayOnDark,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  trustText: { ...type.smallMedium, color: colors.textInverse, textAlign: "center" },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  locationIcon: { fontSize: 18, marginRight: spacing.sm },
  locationLabel: { ...type.caption, color: colors.textMuted },
  locationValue: { ...type.smallMedium, color: colors.textPrimary, marginTop: 1 },
  locationChange: { ...type.smallMedium, color: colors.primary },
  sectionTitle: { ...type.h3, color: colors.textPrimary, marginBottom: spacing.md },
  list: { paddingBottom: spacing.xxxl },
  serviceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  serviceIcon: { fontSize: 20, marginRight: spacing.md },
  serviceButtonText: { ...type.bodyMedium, color: colors.textPrimary, flex: 1 },
  serviceButtonAction: { ...type.smallMedium, color: colors.error },
});
