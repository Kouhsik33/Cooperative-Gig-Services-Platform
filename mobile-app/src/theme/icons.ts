import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

// The icon vocabulary, in one place.
//
// Emoji were previously used as structural icons throughout the app. They
// are font-dependent (a "🛠️" renders differently on every OS and Android
// vendor skin), cannot take a colour from the design tokens, and do not
// scale with the type ramp — so they read as decoration rather than as UI.
// Ionicons ships with Expo, is already used by the tab bar, and is
// vector-based, themeable, and consistent across platforms.
//
// Sizes are tokens rather than per-call numbers so icons keep a shared
// rhythm; strokes stay within one family so the visual weight matches.

export type IconName = ComponentProps<typeof Ionicons>["name"];

export const iconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  hero: 40,
} as const;

/** Service categories, keyed by the backend's real seeded category slugs. */
const CATEGORY_ICONS: Record<string, IconName> = {
  electrician: "flash-outline",
  plumber: "water-outline",
  caregiver: "heart-outline",
  cleaner: "sparkles-outline",
  driver: "car-outline",
  gardener: "leaf-outline",
  technician: "construct-outline",
};

export function iconForCategory(category: string): IconName {
  return CATEGORY_ICONS[category] ?? "briefcase-outline";
}

/** Notification types — mirrors the backend NotificationType enum. */
export const NOTIFICATION_ICONS: Record<string, IconName> = {
  BOOKING_CONFIRMED: "checkmark-circle-outline",
  WORKER_ASSIGNED: "person-outline",
  WORKER_ON_THE_WAY: "walk-outline",
  WORKER_ARRIVED: "location-outline",
  SERVICE_STARTED: "construct-outline",
  SERVICE_COMPLETED: "checkmark-done-outline",
  PAYMENT_RECEIVED: "card-outline",
  RATING_REMINDER: "star-outline",
  NO_WORKER_FOUND: "sad-outline",
  NEW_REQUEST: "notifications-outline",
  REQUEST_TAKEN_ELSEWHERE: "people-outline",
  EARNINGS_CREDITED: "cash-outline",
  WELFARE_CREDITED: "shield-checkmark-outline",
  BOOKING_CANCELLED: "close-circle-outline",
  BOOKING_RESCHEDULED: "calendar-outline",
  EMERGENCY_BOOKING: "warning-outline",
  UNASSIGNED_BOOKING: "alert-circle-outline",
};

/** Named roles used across screens, so no screen picks its own glyph. */
export const icons = {
  location: "location-outline",
  locationFilled: "location",
  search: "search-outline",
  emergency: "flash",
  call: "call-outline",
  chat: "chatbubble-ellipses-outline",
  duration: "time-outline",
  verified: "checkmark-circle",
  welfare: "shield-checkmark-outline",
  fairWage: "scale-outline",
  included: "checkmark",
  excluded: "close",
  chevron: "chevron-forward",
  notifications: "notifications-outline",
  empty: "file-tray-outline",
  error: "alert-circle-outline",
  worker: "person-circle-outline",
  home: "home-outline",
  work: "business-outline",
  addressOther: "bookmark-outline",
  star: "star",
  add: "add",
  navigate: "navigate-outline",
  invoice: "receipt-outline",
  package: "cube-outline",
} satisfies Record<string, IconName>;
