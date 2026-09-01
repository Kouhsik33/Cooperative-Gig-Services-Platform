import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { isEligible, loadCandidates } from "../services/matching.service";
import { computeWageSplit } from "../services/wageSplit";

// Services — Part E, Requirement 3, extended for location-aware discovery
// (product-flow update §10/§12): when the caller supplies lat/lng, each
// service is annotated with real coverage — whether at least one verified
// worker with that skill actually serves that area — rather than the UI
// just relabelling a static, location-blind catalog. Backward compatible:
// with no lat/lng, behaves exactly as before (every service, no coverage
// field).
//
// Coverage deliberately reuses matching.service's eligibility rule rather
// than re-deriving "is this worker near enough", so what the catalog
// promises and what dispatch can actually deliver cannot disagree. The one
// intentional difference is `includeUnavailable` — see loadCandidates.

/**
 * Aggregate social proof for every service in one pass.
 *
 * Two grouped queries rather than per-service counts: the catalog renders
 * every service at once, so a per-row query would be N+1 on the app's most
 * frequently loaded screen.
 */
async function socialProofByService(): Promise<
  Map<string, { ratingAvg: number | null; ratingCount: number; completedCount: number }>
> {
  const [completed, ratings] = await Promise.all([
    prisma.booking.groupBy({
      by: ["serviceId"],
      where: { status: "COMPLETED" },
      _count: { _all: true },
    }),
    prisma.rating.findMany({ select: { stars: true, booking: { select: { serviceId: true } } } }),
  ]);

  const out = new Map<string, { ratingAvg: number | null; ratingCount: number; completedCount: number }>();
  for (const row of completed) {
    out.set(row.serviceId, { ratingAvg: null, ratingCount: 0, completedCount: row._count._all });
  }
  const starsByService = new Map<string, number[]>();
  for (const r of ratings) {
    const id = r.booking.serviceId;
    starsByService.set(id, [...(starsByService.get(id) ?? []), r.stars]);
  }
  for (const [id, stars] of starsByService) {
    const existing = out.get(id) ?? { ratingAvg: null, ratingCount: 0, completedCount: 0 };
    out.set(id, {
      ...existing,
      // null, not 0, when nothing is rated — an unrated service and a
      // zero-star service are different claims.
      ratingAvg: Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10,
      ratingCount: stars.length,
    });
  }
  return out;
}

export async function listServices(req: Request, res: Response) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const hasLocation = !Number.isNaN(lat) && !Number.isNaN(lng);

  const [services, proof] = await Promise.all([
    prisma.service.findMany({
      orderBy: { category: "asc" },
      include: { packages: { orderBy: { tier: "asc" } } },
    }),
    socialProofByService(),
  ]);

  // Social proof and duration ride along even without a location — they
  // are properties of the service, not of where the customer is standing.
  const decorate = (service: (typeof services)[number]) => ({
    ...service,
    ...(proof.get(service.id) ?? { ratingAvg: null, ratingCount: 0, completedCount: 0 }),
    // The catalogue advertises "starting from", so it must reflect the
    // cheapest package a customer can actually buy — not a basePrice that
    // could drift from the package table.
    startingPrice: service.packages.length
      ? Math.min(...service.packages.map((p) => p.price))
      : service.basePrice,
    packageCount: service.packages.length,
  });

  if (!hasLocation) {
    return res.json(services.map(decorate));
  }

  const pincode = typeof req.query.pincode === "string" ? req.query.pincode : null;

  // One candidate load per distinct category, not per service — several
  // services share a category (both "Appliance Repair" and "AC Servicing"
  // are `technician`).
  const categories = Array.from(new Set(services.map((s) => s.category)));
  const coverageByCategory = new Map<string, { covered: number; available: number }>();

  await Promise.all(
    categories.map(async (category) => {
      const ctx = { serviceCategory: category, servicePincode: pincode, latitude: lat, longitude: lng };
      const [all, free] = await Promise.all([
        loadCandidates(category, { includeUnavailable: true }),
        loadCandidates(category),
      ]);
      coverageByCategory.set(category, {
        covered: all.filter((w) => isEligible(w, ctx)).length,
        available: free.filter((w) => isEligible(w, ctx)).length,
      });
    })
  );

  res.json(
    services.map((service) => {
      const c = coverageByCategory.get(service.category) ?? { covered: 0, available: 0 };
      return {
        ...decorate(service),
        // coverage  = does the cooperative serve this area at all
        // available = can someone start on it right now
        coverage: c.covered > 0,
        nearbyWorkerCount: c.covered,
        availableWorkerCount: c.available,
      };
    })
  );
}

// Service detail (master prompt §12 — "a service should feel like a
// product detail page"). Beyond the stored content, this returns the
// social proof the app previously collected but never showed anywhere:
// ratings were written on every completed booking, averaged into
// Worker.ratingAvg, and then read by nothing a customer could see.
const REVIEW_PAGE_SIZE = 10;

export async function getService(req: Request, res: Response) {
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: { packages: { orderBy: { tier: "asc" } } },
  });
  if (!service) return res.status(404).json({ error: "Service not found" });

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const hasLocation = !Number.isNaN(lat) && !Number.isNaN(lng);
  const pincode = typeof req.query.pincode === "string" ? req.query.pincode : null;

  const [completedCount, ratingRows, recentReviews] = await Promise.all([
    prisma.booking.count({ where: { serviceId: service.id, status: "COMPLETED" } }),
    prisma.rating.findMany({
      where: { booking: { serviceId: service.id } },
      select: { stars: true },
    }),
    prisma.rating.findMany({
      where: { booking: { serviceId: service.id }, comment: { not: null } },
      orderBy: { booking: { serviceCompletedAt: "desc" } },
      take: REVIEW_PAGE_SIZE,
      select: {
        id: true,
        stars: true,
        comment: true,
        booking: {
          select: {
            serviceCompletedAt: true,
            customer: { select: { name: true } },
            worker: { select: { user: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const ratingAvg =
    ratingRows.length > 0
      ? Math.round((ratingRows.reduce((sum, r) => sum + r.stars, 0) / ratingRows.length) * 10) / 10
      : null;

  let coverage:
    | { coverage: boolean; nearbyWorkerCount: number; availableWorkerCount: number }
    | null = null;
  if (hasLocation) {
    const ctx = { serviceCategory: service.category, servicePincode: pincode, latitude: lat, longitude: lng };
    const [all, free] = await Promise.all([
      loadCandidates(service.category, { includeUnavailable: true }),
      loadCandidates(service.category),
    ]);
    const nearbyWorkerCount = all.filter((w) => isEligible(w, ctx)).length;
    coverage = {
      coverage: nearbyWorkerCount > 0,
      nearbyWorkerCount,
      availableWorkerCount: free.filter((w) => isEligible(w, ctx)).length,
    };
  }

  res.json({
    ...service,
    ...(coverage ?? {}),
    // Wage-split preview so the customer sees the exact economics before
    // committing (Requirement 12). Computed by the same computeWageSplit
    // the booking itself uses — a hand-rolled preview would be free to
    // drift from what is actually charged, which is the one thing this
    // product cannot afford to get wrong.
    pricePreview: {
      standard: computeWageSplit(service.basePrice, false),
      emergency: computeWageSplit(service.basePrice, true),
    },
    // Per-package split, computed by the same canonical function. The app
    // renders these directly rather than doing arithmetic of its own, so
    // there is exactly one implementation of the fairness rule.
    packages: service.packages.map((p) => ({
      ...p,
      pricePreview: {
        standard: computeWageSplit(p.price, false),
        emergency: computeWageSplit(p.price, true),
      },
    })),
    completedCount,
    // null rather than 0 when nothing has been rated — a 0.0-star service
    // and an unrated service are very different claims.
    ratingAvg,
    ratingCount: ratingRows.length,
    reviews: recentReviews.map((r) => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      completedAt: r.booking.serviceCompletedAt,
      // First name only — a review is public, the customer's full identity
      // is not.
      customerName: r.booking.customer.name.split(" ")[0],
      workerName: r.booking.worker?.user.name ?? null,
    })),
  });
}
