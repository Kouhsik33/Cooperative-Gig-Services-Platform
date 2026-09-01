import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../store/AuthContext";
import { useServiceLocation } from "../../store/LocationContext";
import { useNotifications } from "../../store/NotificationContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { Avatar, Button, Card, SectionHeader } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

// Customer Profile tab (master prompt §7/§53, product-flow update §54).
// Identity, notifications, saved addresses, language, and sign-out — the
// account-level home for the app.
export default function CustomerProfileScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { addresses } = useServiceLocation();
  const { unreadCount } = useNotifications();

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar name={user.name} size={72} />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
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
        <SectionHeader
          title={t("profile.savedAddresses")}
          subtitle={t("profile.savedAddressesHint")}
        />
        {addresses.length === 0 ? (
          <Text style={styles.emptyText}>{t("profile.noSavedAddresses")}</Text>
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={styles.addressRow}>
              <Text style={styles.addressLabel}>{address.label}</Text>
              <Text style={styles.addressLine} numberOfLines={1}>
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""} — {address.pincode}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title={t("profile.language")} subtitle={t("profile.languageHint")} />
        <LanguageSwitcher persist />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.trustNote}>{t("profile.trustNote")}</Text>
      </Card>

      <Button label={t("profile.logOut")} variant="outline" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: { alignItems: "center", marginBottom: spacing.xl },
  name: { ...type.h2, color: colors.textPrimary, marginTop: spacing.md },
  phone: { ...type.body, color: colors.textSecondary, marginTop: 2 },
  card: { marginBottom: spacing.lg },
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
  trustNote: { ...type.small, color: colors.textSecondary, lineHeight: 20 },
  emptyText: { ...type.small, color: colors.textMuted },
  addressRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addressLabel: { ...type.smallMedium, color: colors.textPrimary },
  addressLine: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
});
