import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { useServiceLocation } from "../../store/LocationContext";
import { Button, Card, Chip, SectionHeader } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<HomeStackParamList, "BookingSlot">;

const DAY_COUNT = 5;
const TIME_SLOTS = ["09:00", "11:00", "13:00", "15:00", "17:00"];

// Customer journey step 2 (Part B) — Requirement 3. A simple day + time
// chip picker — no calendar library added; kept dependency-light since
// there's no simulator available in this environment to verify a native
// date picker actually renders correctly.
//
// Also the booking-address confirmation moment (product-flow update §14):
// "Service location — Change" before scheduling, plus optional delivery
// instructions, both attached to this specific booking (§8/§9) — never
// to the customer's saved address. No worker is chosen here (dispatch
// model §8) — that's the whole point of this rework.
//
// On confirm this navigates to the existing FairPricingBreakdownScreen
// with isEmergency: false — that screen is what actually calls
// POST /api/bookings (it already does this for the emergency flow).
// This screen does not call the API itself; doing so would create the
// booking twice.
export default function BookingSlotScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { serviceId, serviceName } = route.params;
  const { location } = useServiceLocation();
  const [instructions, setInstructions] = useState("");

  const dayOptions = useMemo(() => {
    const days: { key: string; label: string; date: Date }[] = [];
    for (let i = 0; i < DAY_COUNT; i++) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + i);
      const label =
        i === 0
          ? t("customer.today")
          : i === 1
          ? t("customer.tomorrow")
          : date.toLocaleDateString(i18n.language, {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
      days.push({ key: date.toISOString(), label, date });
    }
    return days;
  }, [t, i18n.language]);

  const [selectedDay, setSelectedDay] = useState(dayOptions[0]);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[0]);

  function confirm() {
    if (!location) return;
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = new Date(selectedDay.date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    navigation.navigate("FairPricingBreakdown", {
      serviceId,
      scheduledAt: scheduledAt.toISOString(),
      latitude: location.latitude,
      longitude: location.longitude,
      isEmergency: false,
      serviceAddressLine: location.line1,
      serviceLandmark: location.landmark,
      servicePincode: location.pincode,
      contactName: location.contactName,
      contactPhone: location.contactPhone,
      instructions: instructions.trim() || undefined,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.summaryCard}>
        <Text style={styles.title}>{serviceName}</Text>
        <Text style={styles.subtitle}>Find a professional for you — no need to pick one yourself.</Text>
      </Card>

      <SectionHeader title="Service location" />
      <TouchableOpacity style={styles.locationCard} onPress={() => navigation.navigate("LocationPicker")}>
        <Text style={styles.locationIcon}>📍</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.locationLabel}>{location?.label}</Text>
          <Text style={styles.locationLine}>{location?.line1}</Text>
        </View>
        <Text style={styles.changeLink}>Change</Text>
      </TouchableOpacity>

      <SectionHeader title={t("customer.selectDate")} />
      <View style={styles.chipRow}>
        {dayOptions.map((day) => (
          <Chip
            key={day.key}
            label={day.label}
            selected={selectedDay.key === day.key}
            onPress={() => setSelectedDay(day)}
          />
        ))}
      </View>

      <SectionHeader title={t("customer.selectTime")} />
      <View style={styles.chipRow}>
        {TIME_SLOTS.map((slot) => (
          <Chip
            key={slot}
            label={slot}
            selected={selectedTime === slot}
            onPress={() => setSelectedTime(slot)}
          />
        ))}
      </View>

      <SectionHeader title="Instructions (optional)" />
      <TextInput
        style={styles.instructionsInput}
        placeholder="e.g. Ring the bell twice. Parking is available near the entrance."
        placeholderTextColor={colors.textMuted}
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />

      <Button label={t("customer.confirmBooking")} onPress={confirm} style={styles.button} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  summaryCard: { marginBottom: spacing.xl },
  title: { ...type.h3, color: colors.textPrimary },
  subtitle: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  locationIcon: { fontSize: 18, marginRight: spacing.sm },
  locationLabel: { ...type.smallMedium, color: colors.textPrimary },
  locationLine: { ...type.small, color: colors.textSecondary, marginTop: 1 },
  changeLink: { ...type.smallMedium, color: colors.primary },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  instructionsInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 70,
    textAlignVertical: "top",
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    ...type.body,
  },
  button: { marginTop: spacing.xl },
});
