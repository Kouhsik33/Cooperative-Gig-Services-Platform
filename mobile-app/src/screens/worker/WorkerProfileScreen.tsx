import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../store/AuthContext";
import { getWorker } from "../../api/workers";
import type { WorkerProfile } from "../../api/workers";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import {
  Avatar,
  Button,
  Card,
  CertificationBadge,
  Chip,
  ErrorState,
  LoadingState,
  Rating,
  SectionHeader,
  VerifiedBadge,
} from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

// Worker Profile tab (master prompt §26). Certificate data has always
// existed on the backend (Worker.certifications) but was never rendered
// anywhere in the app — this is the first screen that surfaces it.
export default function WorkerProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!user?.worker?.id) {
      setError("No worker profile linked to this account yet.");
      setLoading(false);
      return;
    }
    setLoading(true);
    getWorker(user.worker.id)
      .then((p) => {
        setProfile(p);
        setError(null);
      })
      .catch(() => setError("Could not load your profile."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [user?.worker?.id]);

  if (loading) return <LoadingState />;
  if (error || !profile) return <ErrorState message={error ?? ""} onRetry={load} />;

  const isVerified = profile.verificationStatus === "VERIFIED";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar name={profile.user.name} size={80} />
        <Text style={styles.name}>{profile.user.name}</Text>
        {isVerified ? (
          <VerifiedBadge label="Verified Professional" />
        ) : (
          <Text style={styles.pending}>Verification: {profile.verificationStatus}</Text>
        )}
        <Rating value={profile.ratingAvg} size={16} />
        <Text style={styles.society}>
          {profile.society.name} · {profile.society.federation.name}
        </Text>
      </View>

      <Card style={styles.card}>
        <SectionHeader title="Skills" />
        <View style={styles.chipRow}>
          {profile.skills.map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="Certifications" />
        {profile.certifications.length === 0 ? (
          <Text style={styles.emptyText}>No certifications uploaded yet.</Text>
        ) : (
          <View style={styles.chipRow}>
            {profile.certifications.map((c) => (
              <CertificationBadge key={c} label={c} />
            ))}
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title="Language" subtitle="Applies across the app instantly" />
        <LanguageSwitcher persist />
      </Card>

      <Button label="Log out" variant="outline" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: { alignItems: "center", marginBottom: spacing.xl },
  name: { ...type.h2, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  pending: { ...type.smallMedium, color: colors.warning, marginBottom: spacing.xs },
  society: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
  card: { marginBottom: spacing.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  emptyText: { ...type.small, color: colors.textMuted },
});
