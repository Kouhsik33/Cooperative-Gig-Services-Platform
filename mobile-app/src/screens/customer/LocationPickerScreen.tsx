import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { useServiceLocation, addressToLocation, DEMO_SERVICE_LOCATION } from "../../store/LocationContext";
import { EmptyState } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { icons, iconSize, type IconName } from "../../theme/icons";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<HomeStackParamList, "LocationPicker">;

const LABEL_ICON: Record<string, IconName> = {
  Home: icons.home,
  Work: icons.work,
  Office: icons.work,
};

// Rapido/Swiggy-style location selection (product-flow update §5-9).
// "Use current location" resolves to the fixed demo service area — this
// app deliberately does not use real device GPS (see DEMO_LOCATION and
// LocationContext), so the live-tracking demo runs identically every run.
export default function LocationPickerScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { addresses, loadingAddresses, setLocation } = useServiceLocation();
  const [usingCurrent, setUsingCurrent] = useState(false);

  function selectCurrentLocation() {
    setUsingCurrent(true);
    setTimeout(() => {
      setLocation(DEMO_SERVICE_LOCATION);
      setUsingCurrent(false);
      navigation.goBack();
    }, 350);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("locationPicker.title")}</Text>

      <TouchableOpacity style={styles.currentButton} onPress={selectCurrentLocation} disabled={usingCurrent}>
        {usingCurrent ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Ionicons name={icons.locationFilled} size={iconSize.lg} color={colors.primary} style={styles.currentIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.currentLabel}>{t("locationPicker.useCurrentLocation")}</Text>
              <Text style={styles.currentSub}>{t("locationPicker.demoGpsNote")}</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t("locationPicker.savedAddresses")}</Text>
      {loadingAddresses ? (
        <ActivityIndicator color={colors.primary} />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={icons.location}
          title={t("locationPicker.noSavedAddresses")}
          actionLabel={t("common.addressEmptyCta")}
          onAction={() => navigation.navigate("AddAddress")}
        />
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
            <Ionicons
              name={LABEL_ICON[address.label] ?? icons.addressOther}
              size={iconSize.md}
              color={colors.textSecondary}
              style={styles.addressIcon}
            />
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
        <Text style={styles.addButtonText}>+ {t("locationPicker.addAddress")}</Text>
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
  currentIcon: { marginRight: spacing.md },
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
  addressIcon: { marginRight: spacing.md },
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
