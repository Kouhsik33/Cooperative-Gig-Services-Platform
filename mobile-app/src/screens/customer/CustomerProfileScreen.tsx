import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../store/AuthContext";
import { useServiceLocation } from "../../store/LocationContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { Avatar, Button, Card, SectionHeader } from "../../components/ui";
import { colors, spacing, type } from "../../theme/tokens";

// Customer Profile tab (master prompt §7/§53, product-flow update §54).
// Identity, saved addresses, language, and sign-out — the account-level
// home for the app.
export default function CustomerProfileScreen() {
  const { user, logout } = useAuth();
  const { addresses } = useServiceLocation();

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar name={user.name} size={72} />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
      </View>

      <Card style={styles.card}>
        <SectionHeader
          title="Saved addresses"
          subtitle="Manage from the location picker on Home"
        />
        {addresses.length === 0 ? (
          <Text style={styles.emptyText}>No saved addresses yet.</Text>
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
        <SectionHeader title="Language" subtitle="Applies across the app instantly" />
        <LanguageSwitcher persist />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.trustNote}>
          Every booking you make on this cooperative platform sends a transparent,
          itemized share directly to your service professional's earnings and
          welfare fund — never a hidden platform commission.
        </Text>
      </Card>

      <Button label="Log out" variant="outline" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: { alignItems: "center", marginBottom: spacing.xl },
  name: { ...type.h2, color: colors.textPrimary, marginTop: spacing.md },
  phone: { ...type.body, color: colors.textSecondary, marginTop: 2 },
  card: { marginBottom: spacing.lg },
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
