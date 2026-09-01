export interface Service {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  // Aggregated server-side from real bookings/ratings (see
  // backend service.controller.ts). null rating = never rated, which is
  // deliberately distinct from a zero-star average.
  ratingAvg?: number | null;
  ratingCount?: number;
  completedCount?: number;
  durationMinMinutes?: number | null;
  durationMaxMinutes?: number | null;
  /** Cheapest package a customer can actually buy; falls back to basePrice. */
  startingPrice?: number;
  packageCount?: number;
  // Only present when GET /services was called with lat/lng — see
  // api/services.ts.
  coverage?: boolean;
  nearbyWorkerCount?: number;
  /** Workers free to start right now — distinct from coverage. */
  availableWorkerCount?: number;
}

// Service detail (master prompt §12) — GET /services/:id. Everything
// beyond the catalog fields is aggregated server-side from real bookings
// and ratings, never computed in the app.
export interface ServiceReview {
  id: string;
  stars: number;
  comment: string | null;
  completedAt: string | null;
  /** First name only — reviews are public, full identities are not. */
  customerName: string;
  workerName: string | null;
}

export interface WageSplitPreview {
  totalAmount: number;
  workerShare: number;
  federationFee: number;
  welfareContribution: number;
  emergencyBonus: number;
}

export interface ServicePackage {
  id: string;
  name: string;
  tier: number;
  description: string;
  price: number;
  durationMinMinutes: number;
  durationMaxMinutes: number;
  inclusions: string[];
  isDefault: boolean;
  /** Server-computed by the canonical computeWageSplit — never derived in the app. */
  pricePreview: { standard: WageSplitPreview; emergency: WageSplitPreview };
}

export interface ServiceDetail extends Service {
  packages: ServicePackage[];
  /** Computed server-side by the same computeWageSplit the booking uses. */
  pricePreview?: { standard: WageSplitPreview; emergency: WageSplitPreview };
  description: string | null;
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  inclusions: string[];
  exclusions: string[];
  completedCount: number;
  /** null when nothing has been rated yet — distinct from a 0-star average. */
  ratingAvg: number | null;
  ratingCount: number;
  reviews: ServiceReview[];
}

export interface WorkerSummary {
  id: string;
  skills: string[];
  ratingAvg: number;
  verificationStatus: string;
  distanceKm?: number;
  etaMinutes?: number;
  user: { name: string };
  society: { id: string; name: string; federation: { id: string; name: string } };
}

// REQUESTED now means "created, broadcasting to eligible workers, no
// worker assigned yet" — the dispatch model (SIH26089 update §8-16)
// replaced the previous "customer picks a specific worker" flow. ACCEPTED
// is a legacy value from before the dispatch model, no longer produced
// by new bookings (kept so old data still types correctly).
export type BookingStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ASSIGNED"
  | "ON_THE_WAY"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETION_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED";

export interface Booking {
  id: string;
  status: BookingStatus;
  isEmergency: boolean;
  scheduledAt: string;
  totalAmount: number;
  workerShare: number;
  federationFee: number;
  welfareContribution: number;
  emergencyBonus: number;
  service: Service;
  servicePackage?: { id: string; name: string; description?: string } | null;
  // Null while REQUESTED (still searching, dispatch model) — every
  // status from ASSIGNED onward has one.
  worker: {
    id: string;
    // Present on the booking payload already — surfaced so the customer
    // sees who is coming, not just a name.
    ratingAvg?: number;
    verificationStatus?: string;
    skills?: string[];
    certifications?: string[];
    user: { id: string; name: string; phone?: string };
  } | null;
  customer?: { id: string; name: string; phone?: string };
  // Service coordinates — where the professional should arrive.
  latitude?: number;
  longitude?: number;
  // Service address snapshot (product-flow update §8/§43) — independent
  // of the customer's saved CustomerAddress rows.
  serviceAddressLine?: string | null;
  serviceLandmark?: string | null;
  servicePincode?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  instructions?: string | null;
  serviceStartedAt?: string | null;
  serviceCompletedAt?: string | null;
  // Dispatch tracking (§40-41) — present once the booking has broadcast
  // at least once.
  /** Present once the customer has rated — used to hide a second prompt. */
  rating?: { id: string; stars: number; comment?: string | null } | null;
  eligibleWorkerCount?: number | null;
  broadcastAt?: string | null;
  assignedAt?: string | null;
}
