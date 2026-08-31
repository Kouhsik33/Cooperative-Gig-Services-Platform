import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { haversineKm } from "../lib/geo";

// Worker — Part E, Requirements 1, 2, 4, 7.

export async function createWorker(req: Request, res: Response) {
  if (req.user!.role !== "WORKER") {
    return res
      .status(403)
      .json({ error: "Only WORKER accounts can create a worker profile" });
  }

  const { societyId, skills, certifications, latitude, longitude } =
    req.body ?? {};
  if (!societyId || !Array.isArray(skills) || skills.length === 0) {
    return res
      .status(400)
      .json({ error: "societyId and at least one skill are required" });
  }

  const existing = await prisma.worker.findUnique({
    where: { userId: req.user!.id },
  });
  if (existing) {
    return res
      .status(409)
      .json({ error: "Worker profile already exists for this user" });
  }

  const worker = await prisma.worker.create({
    data: {
      userId: req.user!.id,
      societyId,
      skills,
      certifications: certifications ?? [],
      latitude,
      longitude,
    },
  });

  res.status(201).json(worker);
}

export async function getWorker(req: Request, res: Response) {
  const worker = await prisma.worker.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { name: true, language: true } },
      society: { include: { federation: true } },
    },
  });
  if (!worker) {
    return res.status(404).json({ error: "Worker not found" });
  }
  res.json(worker);
}

// Federation admin action — Requirement 1 (verification badge).
export async function verifyWorker(req: Request, res: Response) {
  if (req.user!.role !== "FEDERATION_ADMIN") {
    return res
      .status(403)
      .json({ error: "Only a federation admin can verify workers" });
  }

  const { status } = req.body ?? {};
  const allowed = ["UNDER_REVIEW", "VERIFIED", "REJECTED"];
  if (!allowed.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of ${allowed.join(", ")}` });
  }

  const worker = await prisma.worker.update({
    where: { id: req.params.id },
    data: { verificationStatus: status },
  });
  res.json(worker);
}

export async function updateWorkerLocation(req: Request, res: Response) {
  const { latitude, longitude } = req.body ?? {};
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res
      .status(400)
      .json({ error: "latitude and longitude must be numbers" });
  }

  const worker = await prisma.worker.findUnique({
    where: { id: req.params.id },
  });
  if (!worker) {
    return res.status(404).json({ error: "Worker not found" });
  }
  if (req.user!.id !== worker.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const updated = await prisma.worker.update({
    where: { id: req.params.id },
    data: { latitude, longitude },
  });
  res.json(updated);
}

const SELF_SETTABLE_AVAILABILITY = ["AVAILABLE", "OFFLINE"];

// Dispatch model (§20) — a worker's own online/offline toggle. BUSY is
// deliberately not self-settable: it's only ever set by acceptBooking
// and cleared back to AVAILABLE by the completion/cancellation paths in
// booking.controller.ts, never chosen directly.
export async function updateAvailability(req: Request, res: Response) {
  const { availability } = req.body ?? {};
  if (!SELF_SETTABLE_AVAILABILITY.includes(availability)) {
    return res.status(400).json({ error: "availability must be AVAILABLE or OFFLINE" });
  }

  const worker = await prisma.worker.findUnique({ where: { id: req.params.id } });
  if (!worker) return res.status(404).json({ error: "Worker not found" });
  if (req.user!.id !== worker.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (worker.availability === "BUSY") {
    return res.status(409).json({ error: "You can't change availability while on an active job" });
  }

  const updated = await prisma.worker.update({
    where: { id: req.params.id },
    data: { availability },
  });
  res.json(updated);
}

// Requirement 4 — nearest-verified-worker matching.
// NOTE: the schema stores plain lat/lng floats rather than a PostGIS
// geography column, so distance is computed with the Haversine formula
// in application code instead of ST_Distance. Same-federation/society
// prioritization is not applied here — the schema has no
// customer-to-federation relation to rank against.
//
// Requirement 6 — "better-rated workers surfaced higher" is a real sort
// factor here, not just a displayed number: workers are bucketed into
// whole-km distance tiers (so matching stays fundamentally
// distance-driven, per Requirement 4) and ranked by ratingAvg within a
// tier, with exact distance as the final tiebreaker. A 1km tier width is
// a judgment call — wide enough for rating to matter among genuinely
// comparable options, narrow enough that "nearest" still dominates.
export async function getNearbyWorkers(req: Request, res: Response) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const skill = typeof req.query.skill === "string" ? req.query.skill : undefined;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng query params are required" });
  }

  const workers = await prisma.worker.findMany({
    where: {
      verificationStatus: "VERIFIED",
      latitude: { not: null },
      longitude: { not: null },
      ...(skill ? { skills: { has: skill } } : {}),
    },
    include: {
      user: { select: { name: true } },
      society: { include: { federation: true } },
    },
  });

  const AVG_SPEED_KMH = 30;
  const withDistance = workers
    .map((w) => {
      const distanceKm = haversineKm(lat, lng, w.latitude!, w.longitude!);
      return {
        ...w,
        distanceKm: Math.round(distanceKm * 10) / 10,
        etaMinutes: Math.round((distanceKm / AVG_SPEED_KMH) * 60),
      };
    })
    .sort((a, b) => {
      const tierA = Math.round(a.distanceKm);
      const tierB = Math.round(b.distanceKm);
      if (tierA !== tierB) return tierA - tierB;
      if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
      return a.distanceKm - b.distanceKm;
    });

  res.json(withDistance);
}

// Requirement 7 — worker's own welfare fund view.
export async function getWorkerWelfare(req: Request, res: Response) {
  const worker = await prisma.worker.findUnique({
    where: { id: req.params.id },
  });
  if (!worker) {
    return res.status(404).json({ error: "Worker not found" });
  }

  const transactions = await prisma.welfareFundTransaction.findMany({
    where: { workerId: req.params.id },
    orderBy: { createdAt: "desc" },
  });

  const totalContributions = transactions
    .filter((t) => t.type === "contribution")
    .reduce((sum, t) => sum + t.amount, 0);

  res.json({
    workerId: worker.id,
    totalContributions: Math.round(totalContributions * 100) / 100,
    transactions,
    insuranceStatus: "ACTIVE", // mocked per spec — no real insurance partner integration
  });
}
