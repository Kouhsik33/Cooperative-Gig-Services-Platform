import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../store/AuthContext";
import { Button, OtpInput } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";
import { useTranslation } from "react-i18next";

type Props = NativeStackScreenProps<RootStackParamList, "Otp">;

// Passwordless login step 2 (product-flow update §37-38). Verification is
// entirely server-side (backend/src/services/otp.service.ts) — this
// screen never compares the entered code against anything itself.
export default function OtpScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { phone } = route.params;
  const { verifyOtp, requestOtp, logout } = useAuth();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handleVerify(code: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await verifyOtp(phone, code);
      if (result.isNewUser) {
        navigation.replace("Register", { phone });
        return;
      }
      if (result.user?.role === "FEDERATION_ADMIN") {
        logout();
        Alert.alert(
          t("auth.adminOnlyTitle"),
          t("auth.adminOnlyMessage")
        );
        navigation.popToTop();
        return;
      }
      // Successful login — RootNavigator switches to CustomerApp/WorkerApp
      // automatically once AuthContext's user state updates.
    } catch (err: any) {
      setError(err?.response?.data?.error ?? t("auth.incorrectCode"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      await requestOtp(phone);
      Alert.alert(t("auth.codeSentTitle"), t("auth.codeSentMessage", { phone }));
    } catch {
      setError(t("auth.resendError"));
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("auth.verifyTitle")}</Text>
      <Text style={styles.subtitle}>We sent a 4-digit code to{"\n"}+91 {phone}</Text>

      <View style={styles.otpWrap}>
        <OtpInput value={otp} onChange={setOtp} autoFocus />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        label={t("auth.verify")}
        onPress={() => handleVerify(otp)}
        loading={loading}
        disabled={otp.length < 4}
        style={styles.button}
      />

      <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resend}>
        <Text style={styles.resendText}>{resending ? "Sending..." : "Resend code"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, paddingTop: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary },
  subtitle: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xxl },
  otpWrap: { marginBottom: spacing.xl },
  error: { ...type.small, color: colors.error, textAlign: "center", marginBottom: spacing.md },
  button: { marginTop: spacing.sm },
  resend: { marginTop: spacing.xl, alignItems: "center" },
  resendText: { ...type.smallMedium, color: colors.primary },
});
