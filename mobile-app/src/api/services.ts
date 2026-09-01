import { apiClient } from "./client";
import type { Service, ServiceDetail } from "./types";

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

// Service detail page data — content, aggregate rating, recent reviews,
// and (when a location is supplied) real coverage for that location.
export async function getService(
  id: string,
  latitude?: number,
  longitude?: number,
  pincode?: string | null
): Promise<ServiceDetail> {
  const { data } = await apiClient.get<ServiceDetail>(`/services/${id}`, {
    params:
      latitude !== undefined && longitude !== undefined
        ? { lat: latitude, lng: longitude, ...(pincode ? { pincode } : {}) }
        : undefined,
  });
  return data;
}
