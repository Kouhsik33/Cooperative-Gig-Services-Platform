import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/AuthContext";
import { listSocieties, createWorkerProfile } from "../../api/auth";
import type { SocietyOption } from "../../api/auth";
import { getServices } from "../../api/services";
import { DEMO_LOCATION } from "../../lib/location";
import { Button, Card, Chip, LoadingState, SectionHeader } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";

const STEPS = [
  { key: "SUBMITTED", label: "Personal information & skills" },
  { key: "UNDER_REVIEW", label: "Federation review" },
  { key: "VERIFIED", label: "Verified professional" },
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
      <Text style={styles.title}>Verification Status</Text>

      {currentIndex === -1 ? (
        <Card style={styles.rejectedCard}>
          <Text style={styles.rejectedText}>
            Your application needs changes. Your federation admin will contact you with next
            steps.
          </Text>
        </Card>
      ) : (
        <Card>
          {STEPS.map((step, i) => (
            <View key={step.key} style={styles.stepRow}>
              <View style={[styles.stepDot, i <= currentIndex && styles.stepDotDone]}>
                <Text style={styles.stepDotText}>{i <= currentIndex ? "✓" : i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i <= currentIndex && styles.stepLabelDone]}>
                {step.label}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {currentIndex === 2 && (
        <View style={styles.verifiedBanner}>
          <Text style={styles.verifiedBannerText}>✓ You are a verified professional</Text>
        </View>
      )}
    </ScrollView>
  );
}

const SKILL_LABELS: Record<string, string> = {
  electrician: "Electrician",
  plumber: "Plumber",
  caregiver: "Caregiver",
  cleaner: "Cleaner",
  driver: "Driver",
  gardener: "Gardener",
  technician: "Technician",
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

  useEffect(() => {
    Promise.all([getServices(), listSocieties()])
      .then(([services, societyList]) => {
        setCategories(Array.from(new Set(services.map((s) => s.category))));
        setSocieties(societyList);
        setSocietyId(societyList[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  async function submit() {
    if (selectedSkills.length === 0 || !societyId) {
      Alert.alert("Select at least one skill and your society to continue");
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
        "Could not submit your profile",
        err?.response?.data?.error ?? "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        Tell us what you do and which cooperative society you belong to — a federation admin
        will review and verify your profile next.
      </Text>

      <SectionHeader title="Your skills" subtitle="Select everything that applies" />
      <View style={styles.chipRow}>
        {categories.map((c) => (
          <Chip
            key={c}
            label={SKILL_LABELS[c] ?? c}
            selected={selectedSkills.includes(c)}
            onPress={() => toggleSkill(c)}
          />
        ))}
      </View>

      <SectionHeader title="Your society" />
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

      <Button label="Submit for verification" onPress={submit} loading={submitting} style={styles.button} />
      <Button label="Cancel" variant="outline" onPress={onCancel} style={styles.cancelButton} />
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
