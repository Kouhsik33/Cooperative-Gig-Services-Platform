import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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

  // Deduplicated at the API boundary: skills/certifications are plain
  // String[] with no DB uniqueness constraint, and a repeated entry both
  // renders a duplicated chip and produces a duplicate React key wherever
  // the list is mapped. The seed had already put {technician,technician}
  // into the database this way.
  const worker = await prisma.worker.create({
    data: {
      userId: req.user!.id,
      societyId,
      skills: Array.from(new Set(skills)),
      certifications: Array.from(new Set(certifications ?? [])),
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
