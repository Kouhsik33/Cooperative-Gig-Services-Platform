import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { haversineKm } from "../lib/geo";

// Services — Part E, Requirement 3, extended for location-aware discovery
// (product-flow update §10/§12): when the caller supplies lat/lng, each
// service is annotated with real coverage — whether at least one verified
// worker with that skill is actually reachable — rather than the UI just
// relabelling a static, location-blind catalog. Backward compatible: with
// no lat/lng, behaves exactly as before (returns every service, no
// coverage field).
const COVERAGE_RADIUS_KM = 25;

export async function listServices(req: Request, res: Response) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const hasLocation = !Number.isNaN(lat) && !Number.isNaN(lng);

  const services = await prisma.service.findMany({
    orderBy: { category: "asc" },
  });

  if (!hasLocation) {
    return res.json(services);
  }

  const verifiedWorkers = await prisma.worker.findMany({
    where: { verificationStatus: "VERIFIED", latitude: { not: null }, longitude: { not: null } },
    select: { skills: true, latitude: true, longitude: true },
  });

  const annotated = services.map((service) => {
    const nearby = verifiedWorkers.filter(
      (w) =>
        w.skills.includes(service.category) &&
        haversineKm(lat, lng, w.latitude!, w.longitude!) <= COVERAGE_RADIUS_KM
    );
    return {
      ...service,
      coverage: nearby.length > 0,
      nearbyWorkerCount: nearby.length,
    };
  });

  res.json(annotated);
}
