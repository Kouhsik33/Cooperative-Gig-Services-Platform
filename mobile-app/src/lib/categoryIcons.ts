// Maps the backend's real seeded service categories (see
// backend/prisma/seed.ts) to a display icon/label. Falls back gracefully
// for any category not in this list rather than crashing.
const CATEGORY_ICONS: Record<string, string> = {
  electrician: "💡",
  plumber: "🔧",
  caregiver: "🧑‍⚕️",
  cleaner: "🧹",
  driver: "🚗",
  gardener: "🌿",
  technician: "🛠️",
};

export function iconForCategory(category: string): string {
  return CATEGORY_ICONS[category] ?? "🧰";
}
