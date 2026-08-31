import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { useServiceLocation, addressToLocation, DEMO_SERVICE_LOCATION } from "../../store/LocationContext";
import { EmptyState } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<HomeStackParamList, "LocationPicker">;

const LABEL_ICON: Record<string, string> = { Home: "🏠", Work: "🏢", Office: "🏢" };

// Rapido/Swiggy-style location selection (product-flow update §5-9).
// "Use current location" gracefully falls back to the documented demo
// location rather than pretending real GPS works — this environment has
// no expo-location wired in (see DEMO_LOCATION's own comment).
export default function LocationPickerScreen({ navigation }: Props) {
  const { addresses, loadingAddresses, setLocation } = useServiceLocation();
  const [usingCurrent, setUsingCurrent] = useState(false);

  function selectDemoLocation() {
    setUsingCurrent(true);
    setTimeout(() => {
      setLocation(DEMO_SERVICE_LOCATION);
      setUsingCurrent(false);
      navigation.goBack();
    }, 400);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choose service location</Text>

      <TouchableOpacity style={styles.currentButton} onPress={selectDemoLocation} disabled={usingCurrent}>
        {usingCurrent ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={styles.currentIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentLabel}>Use current location</Text>
              <Text style={styles.currentSub}>
                Real GPS isn't available in this demo — uses the seeded Pune service area
              </Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Saved addresses</Text>
      {loadingAddresses ? (
        <ActivityIndicator color={colors.primary} />
      ) : addresses.length === 0 ? (
        <EmptyState icon="📭" title="No saved addresses yet" />
      ) : (
        addresses.map((address) => (
          <TouchableOpacity
            key={address.id}
            style={styles.addressCard}
            onPress={() => {
              setLocation(addressToLocation(address));
              navigation.goBack();
            }}
          >
            <Text style={styles.addressIcon}>{LABEL_ICON[address.label] ?? "📍"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>{address.label}</Text>
              <Text style={styles.addressLine}>
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
              </Text>
              <Text style={styles.addressPincode}>{address.pincode}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("AddAddress")}>
        <Text style={styles.addButtonText}>+ Add new address</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.xl },
  currentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  currentIcon: { fontSize: 22, marginRight: spacing.md },
  currentLabel: { ...type.bodyMedium, color: colors.primaryDark },
  currentSub: { ...type.caption, color: colors.primaryDark, marginTop: 2 },
  sectionTitle: { ...type.h3, color: colors.textPrimary, marginBottom: spacing.md },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  addressIcon: { fontSize: 20, marginRight: spacing.md },
  addressLabel: { ...type.bodyMedium, color: colors.textPrimary },
  addressLine: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  addressPincode: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  addButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  addButtonText: { ...type.bodyMedium, color: colors.primary },
});
