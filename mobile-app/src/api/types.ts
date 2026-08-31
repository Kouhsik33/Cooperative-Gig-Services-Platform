export interface Service {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  // Only present when GET /services was called with lat/lng — see
  // api/services.ts.
  coverage?: boolean;
  nearbyWorkerCount?: number;
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
  // Null while REQUESTED (still searching, dispatch model) — every
  // status from ASSIGNED onward has one.
  worker: { id: string; user: { id: string; name: string; phone?: string } } | null;
  customer?: { id: string; name: string; phone?: string };
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
  eligibleWorkerCount?: number | null;
  broadcastAt?: string | null;
  assignedAt?: string | null;
}
