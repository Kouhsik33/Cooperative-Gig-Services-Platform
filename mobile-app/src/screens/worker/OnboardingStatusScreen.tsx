import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/AuthContext";
import { listSocieties, createWorkerProfile } from "../../api/auth";
import type { SocietyOption } from "../../api/auth";
import { getServices } from "../../api/services";
import { DEMO_LOCATION } from "../../lib/location";
import { Button, Card, Chip, ErrorState, LoadingState, SectionHeader } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { icons, iconSize } from "../../theme/icons";

const STEPS = [
  { key: "SUBMITTED", labelKey: "onboarding.stepProfile" },
  { key: "UNDER_REVIEW", labelKey: "onboarding.stepReview" },
  { key: "VERIFIED", labelKey: "onboarding.stepVerified" },
];

// Worker onboarding step 1 (product-flow update — a WORKER account has
// no Worker profile until this form is submitted) and step 2 (Part B
// Requirement 1 — the verification status stepper, once a profile
// exists). One screen, two very different states, matching how little
// there is to show either way.
export default function OnboardingStatusScreen() {
  const { t } = useTranslation();
  const { user, setWorkerInfo, logout } = useAuth();

  if (user?.worker) {
    return <VerificationStatus verificationStatus={user.worker.verificationStatus} />;
  }
  return <WorkerSetupForm onSubmitted={setWorkerInfo} onCancel={logout} title={t("worker.onboardingTitle")} />;
}

function VerificationStatus({ verificationStatus }: { verificationStatus: string }) {
  const { t } = useTranslation();
  const currentIndex =
    verificationStatus === "VERIFIED"
      ? 2
      : verificationStatus === "REJECTED"
      ? -1
      : verificationStatus === "UNDER_REVIEW"
      ? 1
      : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("onboarding.verificationTitle")}</Text>

      {currentIndex === -1 ? (
        <Card style={styles.rejectedCard}>
<Text style={styles.rejectedText}>{t("onboarding.rejected")}</Text>
        </Card>
      ) : (
        <Card>
          {STEPS.map((step, i) => (
            <View key={step.key} style={styles.stepRow}>
              <View style={[styles.stepDot, i <= currentIndex && styles.stepDotDone]}>
                {i <= currentIndex ? (
                  <Ionicons name={icons.included} size={iconSize.sm} color={colors.textInverse} />
                ) : (
                  <Text style={styles.stepDotText}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, i <= currentIndex && styles.stepLabelDone]}>
                {t(step.labelKey)}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {currentIndex === 2 && (
        <View style={styles.verifiedBanner}>
          <Text style={styles.verifiedBannerText}>{t("onboarding.verifiedBanner")}</Text>
        </View>
      )}
    </ScrollView>
  );
}

// Maps a backend service category to its translation key. The selected
// value sent to the API stays the raw category slug — only the label is
// localised.
const SKILL_LABEL_KEYS: Record<string, string> = {
  electrician: "onboarding.skillElectrician",
  plumber: "onboarding.skillPlumber",
  caregiver: "onboarding.skillCaregiver",
  cleaner: "onboarding.skillCleaner",
  driver: "onboarding.skillDriver",
  gardener: "onboarding.skillGardener",
  technician: "onboarding.skillTechnician",
};

function WorkerSetupForm({
  onSubmitted,
  onCancel,
  title,
}: {
  onSubmitted: (worker: { id: string; verificationStatus: string }) => void;
  onCancel: () => void;
  title: string;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [societies, setSocieties] = useState<SocietyOption[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { t } = useTranslation();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getServices(), listSocieties()])
      .then(([services, societyList]) => {
        setCategories(Array.from(new Set(services.map((s) => s.category))));
        setSocieties(societyList);
        setSocietyId(societyList[0]?.id ?? null);
        setLoadError(false);
      })
      // Without this the form rendered with no skills and no societies and
      // no explanation — an unrecoverable dead end for a new worker.
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  async function submit() {
    if (selectedSkills.length === 0 || !societyId) {
      Alert.alert(t("onboarding.selectRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const worker = await createWorkerProfile({
        societyId,
        skills: selectedSkills,
        latitude: DEMO_LOCATION.latitude,
        longitude: DEMO_LOCATION.longitude,
      });
      onSubmitted({ id: worker.id, verificationStatus: worker.verificationStatus });
    } catch (err: any) {
      Alert.alert(
        t("onboarding.submitFailed"),
        err?.response?.data?.error ?? t("onboarding.tryAgain")
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState message={t("onboarding.loadError")} onRetry={load} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
<Text style={styles.subtitle}>{t("onboarding.setupSubtitle")}</Text>

      <SectionHeader title={t("onboarding.yourSkills")} subtitle={t("onboarding.yourSkillsHint")} />
      <View style={styles.chipRow}>
        {categories.map((c) => (
          <Chip
            key={c}
            label={SKILL_LABEL_KEYS[c] ? t(SKILL_LABEL_KEYS[c]) : c}
            selected={selectedSkills.includes(c)}
            onPress={() => toggleSkill(c)}
          />
        ))}
      </View>

      <SectionHeader title={t("onboarding.yourSociety")} />
      <View style={styles.chipRow}>
        {societies.map((s) => (
          <Chip
            key={s.id}
            label={s.name}
            selected={societyId === s.id}
            onPress={() => setSocietyId(s.id)}
          />
        ))}
      </View>

      <Button label={t("onboarding.submit")} onPress={submit} loading={submitting} style={styles.button} />
      <Button label={t("onboarding.cancel")} variant="outline" onPress={onCancel} style={styles.cancelButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...type.body, color: colors.textSecondary, marginBottom: spacing.xl },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  button: { marginTop: spacing.xl },
  cancelButton: { marginTop: spacing.md },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  stepDotDone: { backgroundColor: colors.success },
  stepDotText: { color: colors.textInverse, fontWeight: "700", fontSize: 13 },
  stepLabel: { ...type.body, color: colors.textMuted },
  stepLabelDone: { color: colors.textPrimary, fontWeight: "600" },
  rejectedCard: { backgroundColor: colors.errorLight, borderColor: colors.error },
  rejectedText: { ...type.body, color: colors.error },
  verifiedBanner: {
    marginTop: spacing.lg,
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  verifiedBannerText: { ...type.bodyMedium, color: colors.success },
});
