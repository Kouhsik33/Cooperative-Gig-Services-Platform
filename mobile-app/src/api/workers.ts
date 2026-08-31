import { apiClient } from "./client";

export type WorkerAvailability = "AVAILABLE" | "BUSY" | "OFFLINE";

export interface WorkerProfile {
  id: string;
  skills: string[];
  certifications: string[];
  verificationStatus: string;
  ratingAvg: number;
  availability: WorkerAvailability;
  user: { name: string; language: string };
  society: { id: string; name: string; federation: { id: string; name: string } };
}

// Worker's own full profile — skills, certifications, verification status
// (Requirements 1, 2). GET /workers/:id is the same endpoint the customer
// side's federation-scoped views use; there's no separate "me" route.
export async function getWorker(workerId: string): Promise<WorkerProfile> {
  const { data } = await apiClient.get<WorkerProfile>(`/workers/${workerId}`);
  return data;
}

// Dispatch model (§20) — a worker's own online/offline toggle. BUSY is
// server-controlled only (set by accepting a job, cleared on
// completion/cancellation) — never settable here.
export async function updateAvailability(
  workerId: string,
  availability: "AVAILABLE" | "OFFLINE"
): Promise<WorkerProfile> {
  const { data } = await apiClient.patch<WorkerProfile>(`/workers/${workerId}/availability`, {
    availability,
  });
  return data;
}

export interface WelfareTransaction {
  id: string;
  amount: number;
  type: string;
  createdAt: string;
  bookingId: string | null;
}

export interface WorkerWelfare {
  workerId: string;
  totalContributions: number;
  transactions: WelfareTransaction[];
  insuranceStatus: string;
}

// Requirement 7 — worker's own welfare fund view.
export async function getWorkerWelfare(workerId: string): Promise<WorkerWelfare> {
  const { data } = await apiClient.get<WorkerWelfare>(`/workers/${workerId}/welfare`);
  return data;
}
