import { apiClient } from "./client";

// In-app notifications (master prompt §19). Persisted server-side, so an
// event that happened while the app was closed is still there on next
// open — see backend/src/services/notification.service.ts.

export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "WORKER_ASSIGNED"
  | "WORKER_ON_THE_WAY"
  | "WORKER_ARRIVED"
  | "SERVICE_STARTED"
  | "SERVICE_COMPLETED"
  | "PAYMENT_RECEIVED"
  | "RATING_REMINDER"
  | "NO_WORKER_FOUND"
  | "NEW_REQUEST"
  | "REQUEST_TAKEN_ELSEWHERE"
  | "EARNINGS_CREDITED"
  | "WELFARE_CREDITED"
  | "BOOKING_CANCELLED"
  | "BOOKING_RESCHEDULED"
  | "EMERGENCY_BOOKING"
  | "UNASSIGNED_BOOKING";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  bookingId: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function listNotifications(): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> {
  const { data } = await apiClient.get("/notifications");
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post("/notifications/read-all");
}
