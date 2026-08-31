import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../store/AuthContext";
import { Button, OtpInput } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Otp">;

// Passwordless login step 2 (product-flow update §37-38). Verification is
// entirely server-side (backend/src/services/otp.service.ts) — this
// screen never compares the entered code against anything itself.
export default function OtpScreen({ route, navigation }: Props) {
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
          "Use the admin dashboard",
          "Federation admins sign in at the admin-web dashboard, not the mobile app."
        );
        navigation.popToTop();
        return;
      }
      // Successful login — RootNavigator switches to CustomerApp/WorkerApp
      // automatically once AuthContext's user state updates.
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Incorrect code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      await requestOtp(phone);
      Alert.alert("Code sent", `A new code has been sent to +91 ${phone}`);
    } catch {
      setError("Could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your number</Text>
      <Text style={styles.subtitle}>We sent a 4-digit code to{"\n"}+91 {phone}</Text>

      <View style={styles.otpWrap}>
        <OtpInput value={otp} onChange={setOtp} autoFocus />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        label="Verify"
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
