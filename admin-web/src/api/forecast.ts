import { apiClient } from "./client";

export interface ForecastEntry {
  serviceCategory: string;
  predictedBookings: number;
  recommendedWorkers: number;
  /** How the figures were derived — shown so the recommendation is auditable, not a bare number (master prompt §24). */
  dailyAverage?: number;
  basis?: string;
  /** Recent window vs the full history behind it — drives the trend copy. */
  baselineDailyAverage?: number;
  trendPercent?: number | null;
  demandLevel?: "none" | "low" | "medium" | "high";
  reason?: string;
}

export interface DemandForecastResponse {
  federationId: string;
  days: number;
  forecast: ForecastEntry[];
}

// Requirement 11 — backend proxies this to the Python ai-service, which
// computes a simple moving average over the seeded booking history.
export async function getDemandForecast(
  federationId: string,
  days = 7
): Promise<DemandForecastResponse> {
  const { data } = await apiClient.get<DemandForecastResponse>("/forecast/demand", {
    params: { federationId, days },
  });
  return data;
}
