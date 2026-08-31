import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

// Worker journey step 5 (Part B) — Requirement 8. Shows the boosted
// earning explicitly: "Emergency bonus: +₹X added to your share".
// TODO(Phase 4): implement, wire to Socket.io booking:emergency event.
export default function EmergencyAlertScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text>{t("worker.emergencyAlertTitle")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
