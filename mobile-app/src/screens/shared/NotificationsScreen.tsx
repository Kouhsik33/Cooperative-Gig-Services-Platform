import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNotifications } from "../../store/NotificationContext";
import type { AppNotification, NotificationType } from "../../api/notifications";
import { formatDateTime } from "../../lib/format";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { colors, radius, spacing, type } from "../../theme/tokens";
import { NOTIFICATION_ICONS, icons as ICON, iconSize } from "../../theme/icons";
import { Ionicons } from "@expo/vector-icons";

// The notification inbox, shared by both roles (master prompt §19).
// Tapping a row that references a booking opens that booking's tracking /
// job screen, which is what makes a notification actionable rather than
// merely informative.


interface Props {
  /** Given by each role's navigator. The whole notification is passed (not
   *  just the bookingId) because the right destination depends on the
   *  notification type — e.g. a worker's NEW_REQUEST opens the Jobs feed
   *  where Accept lives, not a job-detail screen they can't yet load. */
  onOpenNotification?: (n: AppNotification) => void;
}

export default function NotificationsScreen({ onOpenNotification }: Props) {
  const { t, i18n } = useTranslation();
  const { notifications, unreadCount, loading, loadFailed, refresh, markRead, markAllRead } =
    useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function onPress(n: AppNotification) {
    if (!n.readAt) markRead(n.id);
    if (onOpenNotification) onOpenNotification(n);
  }

  if (loading && notifications.length === 0) return <LoadingState />;
  // Only when there is nothing to show — a refresh failure over an
  // already-populated list should not blank out what the user can read.
  if (loadFailed && notifications.length === 0) {
    return (
      <ErrorState
        message={t("common.notificationsLoadFailed")}
        onRetry={refresh}
        retryLabel={t("common.retry")}
      />
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(n) => n.id}
      contentContainerStyle={
        notifications.length === 0 ? styles.emptyContainer : styles.container
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        unreadCount > 0 ? (
          <View style={styles.header}>
            <Text style={styles.headerCount}>
              {t("notifications.unread", { count: unreadCount })}
            </Text>
            <TouchableOpacity
              onPress={markAllRead}
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.markAll}>{t("notifications.markAllRead")}</Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon={ICON.notifications}
          title={t("notifications.emptyTitle")}
          body={t("notifications.emptyBody")}
        />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.row, !item.readAt && styles.rowUnread]}
          onPress={() => onPress(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.body}`}
        >
          <Ionicons
            name={NOTIFICATION_ICONS[item.type] ?? ICON.notifications}
            size={iconSize.md}
            color={item.readAt ? colors.textMuted : colors.primary}
            style={styles.icon}
          />
          <View style={styles.body}>
            <Text style={[styles.title, !item.readAt && styles.titleUnread]}>{item.title}</Text>
            <Text style={styles.text}>{item.body}</Text>
            <Text style={styles.time}>{formatDateTime(item.createdAt, i18n.language)}</Text>
          </View>
          {!item.readAt && <View style={styles.dot} />}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  headerCount: { ...type.smallMedium, color: colors.textSecondary, flexShrink: 1, marginRight: spacing.md },
  markAll: { ...type.smallMedium, color: colors.primary, flexShrink: 0 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  icon: { marginRight: spacing.md, marginTop: 1 },
  body: { flex: 1 },
  title: { ...type.bodyMedium, color: colors.textPrimary },
  titleUnread: { color: colors.primaryDark },
  text: { ...type.small, color: colors.textSecondary, marginTop: 2 },
  time: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
});
