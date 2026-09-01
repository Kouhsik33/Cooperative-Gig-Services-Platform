import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../store/AuthContext";
import { Button, Card, FormScreen } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

// New-account step, reached only after OtpScreen's server-side check
// reports this phone has no account yet (product-flow update §36-42) —
// no password field, matching the rest of the passwordless flow. Kept
// deliberately minimal (name + role) rather than one giant form; a
// WORKER account's skills/society/certifications are collected next, on
// OnboardingStatusScreen, once they're actually signed in.
export default function RegisterScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { phone } = route.params;
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "WORKER">("CUSTOMER");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert(t("auth.nameRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await register({ name: name.trim(), phone, role });
      // RootNavigator switches to CustomerApp/WorkerApp automatically.
    } catch (err: any) {
      Alert.alert(
        t("auth.registerFailedTitle"),
        err?.response?.data?.error ?? t("auth.registerFailedMessage")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("auth.registerTitle")}</Text>
      <Text style={styles.subtitle}>+91 {phone}</Text>

      <Text style={styles.label}>{t("auth.yourName")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("auth.namePlaceholder")}
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>I am a</Text>
      <View style={styles.roleRow}>
        <RoleCard
          label={t("auth.roleCustomer")}
          description={t("auth.roleCustomerHint")}
          selected={role === "CUSTOMER"}
          onPress={() => setRole("CUSTOMER")}
        />
        <RoleCard
          label={t("auth.roleWorker")}
          description={t("auth.roleWorkerHint")}
          selected={role === "WORKER"}
          onPress={() => setRole("WORKER")}
        />
      </View>

      <Button label={t("auth.createAccount")} onPress={handleSubmit} loading={submitting} style={styles.button} />
    </FormScreen>
  );
}

function RoleCard({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={[styles.roleCard, selected && styles.roleCardSelected]}>
      <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>{label}</Text>
      <Text style={styles.roleDescription}>{description}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary },
  subtitle: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { ...type.smallMedium, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    ...type.body,
  },
  roleRow: { flexDirection: "row", gap: spacing.md },
  roleCard: { flex: 1 },
  roleCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleLabel: { ...type.h3, color: colors.textPrimary },
  roleLabelSelected: { color: colors.primaryDark },
  roleDescription: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xs },
  button: { marginTop: spacing.xxl },
});
