import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../store/AuthContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { Button } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

// Passwordless login step 1 (product-flow update §36-37) — phone number
// only, no password field. "Continue" requests an OTP and moves to
// OtpScreen; the OTP itself is always validated server-side.
export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (phone.trim().length < 6) {
      Alert.alert(t("auth.invalidPhone"));
      return;
    }
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      navigation.navigate("Otp", { phone: phone.trim() });
    } catch {
      Alert.alert(t("auth.otpSendError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logo}>
        <Ionicons name="people" size={iconSize.xl} color={colors.primaryForeground} />
      </View>
          <Text style={styles.title}>{t("common.appName")}</Text>
          <Text style={styles.tagline}>{t("auth.tagline")}</Text>
        </View>

        <View style={styles.switcher}>
          <LanguageSwitcher />
        </View>

        <Text style={styles.welcome}>{t("auth.welcomeBack")}</Text>
        <Text style={styles.label}>{t("auth.mobileNumber")}</Text>
        <View style={styles.phoneRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+91</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="98765 43210"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            autoCapitalize="none"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
          />
        </View>

        <Button label={t("auth.continue")} onPress={handleContinue} loading={loading} style={styles.button} />

        <Text style={styles.demoHint}>
          {t("auth.demoHint")}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
  brand: { alignItems: "center", marginBottom: spacing.xxl },
  logo: { fontSize: 40, marginBottom: spacing.sm },
  title: { ...type.h1, color: colors.textPrimary, textAlign: "center" },
  tagline: { ...type.small, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs },
  switcher: { marginBottom: spacing.xl, alignItems: "center" },
  welcome: { ...type.h2, color: colors.textPrimary, marginBottom: spacing.lg },
  label: { ...type.smallMedium, color: colors.textSecondary, marginBottom: spacing.sm },
  phoneRow: { flexDirection: "row", marginBottom: spacing.md },
  countryCode: {
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    backgroundColor: colors.surface,
  },
  countryCodeText: { ...type.body, color: colors.textPrimary },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: colors.border,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    ...type.body,
  },
  button: { marginTop: spacing.sm },
  demoHint: { ...type.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
