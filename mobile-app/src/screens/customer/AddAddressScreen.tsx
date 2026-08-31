import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../../navigation/CustomerNavigator";
import { createAddress } from "../../api/addresses";
import { useServiceLocation, addressToLocation } from "../../store/LocationContext";
import { DEMO_LOCATION } from "../../lib/location";
import { Button, Chip } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<HomeStackParamList, "AddAddress">;

const LABELS = ["Home", "Work", "Other"];

// Swiggy-style address details form (product-flow update §9). Latitude/
// longitude default to DEMO_LOCATION jittered slightly — there's no
// geocoding service wired in, so a typed street address can't be turned
// into real coordinates yet; flagged rather than faked as precise.
export default function AddAddressScreen({ navigation }: Props) {
  const { refreshAddresses, setLocation } = useServiceLocation();
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!line1.trim() || !pincode.trim()) {
      Alert.alert("House/flat details and pincode are required");
      return;
    }
    setSubmitting(true);
    try {
      const address = await createAddress({
        label,
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        landmark: landmark.trim() || undefined,
        pincode: pincode.trim(),
        latitude: DEMO_LOCATION.latitude,
        longitude: DEMO_LOCATION.longitude,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
      await refreshAddresses();
      setLocation(addressToLocation(address));
      navigation.pop(2);
    } catch {
      Alert.alert("Could not save this address. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add new address</Text>

      <Text style={styles.label}>Save as</Text>
      <View style={styles.chipRow}>
        {LABELS.map((l) => (
          <Chip key={l} label={l} selected={label === l} onPress={() => setLabel(l)} />
        ))}
      </View>

      <Field label="House / Flat / Door No." value={line1} onChangeText={setLine1} placeholder="Flat 302, Green Residency" />
      <Field label="Building / Apartment / Area" value={line2} onChangeText={setLine2} placeholder="Kothrud" />
      <Field label="Landmark (optional)" value={landmark} onChangeText={setLandmark} placeholder="Near City Hospital" />
      <Field label="Pincode" value={pincode} onChangeText={setPincode} placeholder="411038" keyboardType="number-pad" />
      <Field label="Contact name" value={contactName} onChangeText={setContactName} placeholder="Who should the professional ask for?" />
      <Field label="Contact phone" value={contactPhone} onChangeText={setContactPhone} placeholder="10-digit mobile number" keyboardType="phone-pad" />

      <Button label="Save address" onPress={submit} loading={submitting} style={styles.button} />
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textMuted}
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.xl },
  field: { marginBottom: spacing.lg },
  label: { ...type.smallMedium, color: colors.textSecondary, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    ...type.body,
  },
  chipRow: { flexDirection: "row", marginBottom: spacing.lg },
  button: { marginTop: spacing.md },
});
