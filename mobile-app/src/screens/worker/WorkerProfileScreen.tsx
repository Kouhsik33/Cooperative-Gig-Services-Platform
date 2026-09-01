import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../store/AuthContext";
import { useNotifications } from "../../store/NotificationContext";
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
export default function WorkerProfileScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!user?.worker?.id) {
      setError(t("profile.noWorkerProfile"));
      setLoading(false);
      return;
    }
    setLoading(true);
    getWorker(user.worker.id)
      .then((p) => {
        setProfile(p);
        setError(null);
      })
      .catch(() => setError(t("profile.loadError")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [user?.worker?.id, t]);

  if (loading) return <LoadingState />;
  if (error || !profile) return <ErrorState message={error ?? ""} onRetry={load} />;

  const isVerified = profile.verificationStatus === "VERIFIED";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar name={profile.user.name} size={80} />
        <Text style={styles.name}>{profile.user.name}</Text>
        {isVerified ? (
          <VerifiedBadge label={t("profile.verifiedProfessional")} />
        ) : (
          <Text style={styles.pending}>
            {t("profile.verificationStatus", { status: profile.verificationStatus })}
          </Text>
        )}
        <Rating value={profile.ratingAvg} size={16} />
        <Text style={styles.society}>
          {profile.society.name} · {profile.society.federation.name}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate("Notifications")}
        accessibilityRole="button"
        accessibilityLabel={t("profile.notifications")}
      >
        <Card style={styles.card}>
          <View style={styles.navRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            <View style={styles.navText}>
              <Text style={styles.navTitle}>{t("profile.notifications")}</Text>
              <Text style={styles.navSubtitle}>{t("profile.notificationsHint")}</Text>
            </View>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </Card>
      </TouchableOpacity>

      <Card style={styles.card}>
        <SectionHeader title={t("profile.skills")} />
        <View style={styles.chipRow}>
          {profile.skills.map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <SectionHeader title={t("profile.certifications")} />
        {profile.certifications.length === 0 ? (
          <Text style={styles.emptyText}>{t("profile.noCertifications")}</Text>
        ) : (
          <View style={styles.chipRow}>
            {profile.certifications.map((c) => (
              <CertificationBadge key={c} label={c} />
            ))}
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title={t("profile.language")} subtitle={t("profile.languageHint")} />
        <LanguageSwitcher persist />
      </Card>

      <Button label={t("profile.logOut")} variant="outline" onPress={logout} />
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
  navRow: { flexDirection: "row", alignItems: "center" },
  navText: { flex: 1, marginLeft: spacing.md },
  navTitle: { ...type.bodyMedium, color: colors.textPrimary },
  navSubtitle: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  badgeText: { ...type.caption, color: colors.textInverse },
  emptyText: { ...type.small, color: colors.textMuted },
});
