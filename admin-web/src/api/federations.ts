import { apiClient } from "./client";

export interface FederationWorker {
  id: string;
  skills: string[];
  certifications: string[];
  verificationStatus: "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
  availability: "AVAILABLE" | "BUSY" | "OFFLINE";
  ratingAvg: number;
  user: { id: string; name: string; phone: string };
  society: { id: string; name: string };
}

export interface DashboardSummary {
  totalWorkers: number;
  activeBookings: number;
  welfareFundBalance: number;
  avgWorkerSharePercent: number;
}

export interface WelfareFund {
  id: string;
  federationId: string;
  balance: number;
}

export interface WelfareFundTransaction {
  id: string;
  amount: number;
  type: string;
  createdAt: string;
  bookingId: string | null;
  worker: { id: string; user: { id: string; name: string } };
}

export interface FairnessMetrics {
  avgWorkerSharePercent: number;
  completedBookings: number;
}

export interface FederationBooking {
  id: string;
  status: string;
  isEmergency: boolean;
  scheduledAt: string;
  totalAmount: number;
  workerShare: number;
  createdAt: string;
  servicePincode: string | null;
  serviceStartedAt: string | null;
  serviceCompletedAt: string | null;
  eligibleWorkerCount: number | null;
  broadcastAt: string | null;
  assignedAt: string | null;
  service: { name: string; category: string };
  // Null while REQUESTED (dispatch model — still broadcasting, nobody
  // has accepted yet).
  worker: { id: string; user: { id: string; name: string } } | null;
  customer: { id: string; name: string };
}

export async function getDashboard(federationId: string): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>(
    `/federations/${federationId}/dashboard`
  );
  return data;
}

export async function getFederationWorkers(
  federationId: string
): Promise<FederationWorker[]> {
  const { data } = await apiClient.get<FederationWorker[]>(
    `/federations/${federationId}/workers`
  );
  return data;
}

export async function verifyWorker(
  workerId: string,
  status: "VERIFIED" | "REJECTED" | "UNDER_REVIEW"
): Promise<FederationWorker> {
  const { data } = await apiClient.patch<FederationWorker>(
    `/workers/${workerId}/verify`,
    { status }
  );
  return data;
}

export async function getWelfareFund(federationId: string): Promise<WelfareFund> {
  const { data } = await apiClient.get<WelfareFund>(
    `/federations/${federationId}/welfare-fund`
  );
  return data;
}

export async function getWelfareFundTransactions(
  federationId: string,
  workerId?: string
): Promise<WelfareFundTransaction[]> {
  const { data } = await apiClient.get<WelfareFundTransaction[]>(
    `/federations/${federationId}/welfare-fund/transactions`,
    { params: workerId ? { workerId } : undefined }
  );
  return data;
}

export async function getFairnessMetrics(
  federationId: string
): Promise<FairnessMetrics> {
  const { data } = await apiClient.get<FairnessMetrics>(
    `/federations/${federationId}/fairness-metrics`
  );
  return data;
}

// Not in Part E — see the gap note in backend/src/controllers/federation.controller.ts.
export interface GeoDemandRow {
  pincode: string;
  society: string;
  availableWorkers: number;
  demand: number;
}

// Requirement 4/34 — geo-spatial admin view: demand and available
// workforce grouped by locality pincode.
export async function getGeoDemand(federationId: string): Promise<GeoDemandRow[]> {
  const { data } = await apiClient.get<GeoDemandRow[]>(
    `/federations/${federationId}/geo-demand`
  );
  return data;
}

export interface DispatchAnalytics {
  avgAssignmentSeconds: number | null;
  stillSearching: number;
  assigned: number;
  workersAvailable: number;
  workersBusy: number;
}

// Dispatch model update §40-41 — the platform-intelligence story: how
// fast the system finds a worker, and how much of the workforce is
// online right now.
export async function getDispatchAnalytics(federationId: string): Promise<DispatchAnalytics> {
  const { data } = await apiClient.get<DispatchAnalytics>(
    `/federations/${federationId}/dispatch-analytics`
  );
  return data;
}

export async function getFederationBookings(
  federationId: string
): Promise<FederationBooking[]> {
  const { data } = await apiClient.get<FederationBooking[]>(
    `/federations/${federationId}/bookings`
  );
  return data;
}
