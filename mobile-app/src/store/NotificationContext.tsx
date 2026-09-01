import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import type { AppNotification } from "../api/notifications";
import { getSocket } from "../lib/socket";

// App-wide notification state (master prompt §19), so the unread badge on
// the bell and the list on the notifications screen are always the same
// number — rather than two components each fetching and disagreeing.
//
// Refetches on `notification:new` instead of appending the socket payload:
// notifyMany() cannot return created rows, so its live payload has no id.
// Treating the socket purely as a "something changed" signal keeps this
// list authoritative and id-complete either way.

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  loadFailed: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  loadFailed: false,
  refresh: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
      // A notification list that won't load must never block the app.
      // The previous state stays on screen rather than being cleared.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onNew() {
      refresh();
    }
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic: the badge should drop the moment the row is tapped.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(id);
    } catch {
      // Server disagreed — re-sync rather than leaving a wrong badge.
      await refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      await refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ notifications, unreadCount, loading, loadFailed, refresh, markRead, markAllRead }),
    [notifications, unreadCount, loading, loadFailed, refresh, markRead, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
