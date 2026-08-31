import { apiClient } from "./client";
import type { Service } from "./types";

// Location-aware catalog (product-flow update §10-12): passing lat/lng
// annotates each service with real coverage (at least one verified
// worker with that skill reachable) instead of a static, location-blind
// list — see backend/src/controllers/service.controller.ts.
export async function getServices(latitude?: number, longitude?: number): Promise<Service[]> {
  const { data } = await apiClient.get<Service[]>("/services", {
    params:
      latitude !== undefined && longitude !== undefined
        ? { lat: latitude, lng: longitude }
        : undefined,
  });
  return data;
}
