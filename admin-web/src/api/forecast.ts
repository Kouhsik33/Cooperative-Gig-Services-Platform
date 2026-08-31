import { apiClient } from "./client";

export interface ForecastEntry {
  serviceCategory: string;
  predictedBookings: number;
  recommendedWorkers: number;
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
