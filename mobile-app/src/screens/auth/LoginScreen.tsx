import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../store/AuthContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { Button } from "../../components/ui";
import { borders, colors, radius, shadow, spacing, type } from "../../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: EST. 2026 Card with Language Bar directly below */}
        <View style={styles.topHeader}>
          <View style={styles.brandEst}>
            <Text style={styles.brandEstText}>EST. 2026</Text>
          </View>
          <View style={styles.langWrapper}>
            <LanguageSwitcher center />
          </View>
        </View>

        {/* Hero Section: Centered & Balanced */}
        <View style={styles.heroSection}>
          <View style={styles.emblemBadge}>
            <View style={styles.emblemInner}>
              <MaterialCommunityIcons name="hand-heart" size={30} color={colors.primary} />
            </View>
            <View style={styles.sparkleBadge}>
              <Ionicons name="sparkles" size={10} color={colors.surface} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Sahakãrya</Text>
          <View style={styles.goldSubtitlePill}>
            <Text style={styles.goldSubtitleText}>COOPERATIVE GIG NETWORK</Text>
          </View>
          <Text style={styles.tagline}>{t("auth.tagline")}</Text>
        </View>

        {/* Login Form Card */}
        <View style={[styles.loginCard, shadow.md]}>
          <Text style={styles.cardHeader}>{t("auth.welcomeBack")}</Text>
          <Text style={styles.label}>{t("auth.mobileNumber")}</Text>

          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="9000000201"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              autoCapitalize="none"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
          </View>

          <Button
            label={t("auth.continue")}
            onPress={handleContinue}
            loading={loading}
            variant="primary"
            style={styles.button}
          />
        </View>

        {/* Demo Credentials Footer */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>✨ Quick Demo Credentials (OTP: 0000)</Text>
          <Text style={styles.demoText}>Customer: 9000000201 • Worker: 9000000122</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  topHeader: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  brandEst: {
    borderWidth: borders.thin,
    borderColor: borders.color,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    ...Platform.select({
      web: { boxShadow: `1.5px 1.5px 0px ${borders.color}` } as any,
      default: {
        shadowColor: borders.color,
        shadowOffset: { width: 1.5, height: 1.5 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 1,
      },
    }),
  },
  brandEstText: {
    ...type.caption,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  langWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  emblemBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: borders.color,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    position: "relative",
    ...Platform.select({
      web: { boxShadow: `3px 3px 0px ${borders.color}` } as any,
      default: {
        shadowColor: borders.color,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
      },
    }),
  },
  emblemInner: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    borderWidth: borders.thin,
    borderColor: borders.color,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: `1px 1px 0px ${borders.color}` } as any,
      default: {
        shadowColor: borders.color,
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 2,
      },
    }),
  },
  heroTitle: {
    ...type.display,
    fontFamily: "Kaltera",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: colors.primary,
    textAlign: "center",
    letterSpacing: 1.5,
  },
  goldSubtitlePill: {
    backgroundColor: colors.skyLight,
    borderWidth: borders.thin,
    borderColor: borders.color,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  goldSubtitleText: {
    ...type.caption,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  tagline: {
    ...type.small,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  loginCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: borders.color,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    ...type.h2,
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  label: {
    ...type.smallMedium,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  phoneRow: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    height: 50,
  },
  countryCode: {
    justifyContent: "center",
    alignItems: "center",
    width: 64,
    borderWidth: borders.default,
    borderColor: borders.color,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    backgroundColor: colors.skyLight,
  },
  countryCodeText: {
    ...type.bodyMedium,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderLeftWidth: 0,
    borderColor: borders.color,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...type.bodyMedium,
    fontWeight: "700",
  },
  button: {
    marginTop: spacing.xs,
  },
  demoCard: {
    backgroundColor: colors.skyLight,
    borderWidth: borders.thin,
    borderColor: borders.color,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  demoTitle: {
    ...type.caption,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  demoText: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
