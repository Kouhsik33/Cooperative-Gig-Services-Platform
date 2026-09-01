import { apiClient } from "./client";

// Real cooperative-impact aggregates (master prompt §40). These replaced
// hardcoded literals on the home screen — see
// backend/src/controllers/impact.controller.ts.
export interface CooperativeImpact {
  verifiedWorkers: number;
  completedServices: number;
  welfareGenerated: number;
  /** null until at least one booking has completed — never render a fake 0%. */
  avgWorkerSharePercent: number | null;
}

export async function getCooperativeImpact(): Promise<CooperativeImpact> {
  const { data } = await apiClient.get<CooperativeImpact>("/impact");
  return data;
}
