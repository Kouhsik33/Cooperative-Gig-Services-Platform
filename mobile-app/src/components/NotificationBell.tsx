import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "../store/NotificationContext";
import { colors, spacing, type } from "../theme/tokens";

// The unread badge reads from NotificationContext, so it stays in step
// with the notifications screen and updates live on `notification:new`
// without this component knowing anything about sockets.
export default function NotificationBell({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? t("notifications.bellUnread", { count: unreadCount })
          : t("notifications.bell")
      }
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { padding: spacing.xs },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { ...type.caption, color: colors.textInverse, fontSize: 10, lineHeight: 13 },
});
