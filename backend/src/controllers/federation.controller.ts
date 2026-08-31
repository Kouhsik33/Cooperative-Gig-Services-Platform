import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Federation — Part E, Requirement 9 (admin dashboard) + Requirement 12 (fairness metrics).
// Every handler here is reached only via routes gated by requireOwnFederation
// (see federation.routes.ts), so req.params.id is always the caller's own
// federation — no per-handler ownership check needed.

async function computeFairnessMetrics(federationId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      worker: { society: { federationId } },
      status: "COMPLETED",
    },
    select: { totalAmount: true, workerShare: true },
  });

  if (bookings.length === 0) {
    return { avgWorkerSharePercent: 0, completedBookings: 0 };
  }

  const avgWorkerSharePercent =
    bookings.reduce((sum, b) => sum + (b.workerShare / b.totalAmount) * 100, 0) /
    bookings.length;

  return {
    avgWorkerSharePercent: Math.round(avgWorkerSharePercent * 100) / 100,
    completedBookings: bookings.length,
  };
}

// Requirement 9 — dashboard home aggregate cards (Part B): total workers,
// active bookings, welfare fund balance, average worker earning share %.
export async function getDashboard(req: Request, res: Response) {
  const federationId = req.params.id;

  const societies = await prisma.society.findMany({
    where: { federationId },
    select: { pincode: true },
  });
  const pincodes = societies.map((s) => s.pincode).filter((p): p is string => !!p);

  const [totalWorkers, assignedActiveBookings, searchingBookings, welfareFund, fairness] =
    await Promise.all([
      prisma.worker.count({ where: { society: { federationId } } }),
      // Assigned-or-later active bookings can be scoped through the
      // worker relation. Still-searching (REQUESTED, workerId null)
      // bookings can't — see the note on getDispatchAnalytics — so
      // they're counted separately by matching pincode instead.
      prisma.booking.count({
        where: {
          worker: { society: { federationId } },
          status: { in: ["ACCEPTED", "ASSIGNED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETION_PENDING"] },
        },
      }),
      prisma.booking.count({
        where: { status: "REQUESTED", workerId: null, servicePincode: { in: pincodes } },
      }),
      prisma.welfareFund.findUnique({ where: { federationId } }),
      computeFairnessMetrics(federationId),
    ]);
  const activeBookings = assignedActiveBookings + searchingBookings;

  res.json({
    totalWorkers,
    activeBookings,
    welfareFundBalance: welfareFund?.balance ?? 0,
    avgWorkerSharePercent: fairness.avgWorkerSharePercent,
  });
}

// Requirement 1 — powers the federation admin's worker verification queue
// and the worker management roster.
export async function getFederationWorkers(req: Request, res: Response) {
  const workers = await prisma.worker.findMany({
    where: { society: { federationId: req.params.id } },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      society: true,
    },
  });
  res.json(workers);
}

// Not in Part E — needed to power the "bookings oversight" page, since
// Part E's only booking-listing endpoint (GET /api/bookings?userId=&role=)
// is scoped to a single user, not a whole federation. Flagged as an
// addition, not a spec-literal endpoint. Capped at 100 most-recent rows;
// a real implementation would paginate.
export async function getFederationBookings(req: Request, res: Response) {
  const bookings = await prisma.booking.findMany({
    where: { worker: { society: { federationId: req.params.id } } },
    include: {
      service: true,
      worker: { include: { user: { select: { id: true, name: true } } } },
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(bookings);
}

export async function getWelfareFund(req: Request, res: Response) {
  const welfareFund = await prisma.welfareFund.findUnique({
    where: { federationId: req.params.id },
  });
  if (!welfareFund) {
    return res.status(404).json({ error: "No welfare fund found for this federation" });
  }
  res.json(welfareFund);
}

// Requirement 7 — transaction log, filterable by worker (Part B).
export async function getWelfareFundTransactions(req: Request, res: Response) {
  const workerId = typeof req.query.workerId === "string" ? req.query.workerId : undefined;

  const welfareFund = await prisma.welfareFund.findUnique({
    where: { federationId: req.params.id },
  });
  if (!welfareFund) {
    return res.status(404).json({ error: "No welfare fund found for this federation" });
  }

  const transactions = await prisma.welfareFundTransaction.findMany({
    where: { welfareFundId: welfareFund.id, ...(workerId ? { workerId } : {}) },
    include: { worker: { include: { user: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(transactions);
}

// Requirement 12 — e.g. "avg. worker share % this month". Computed across
// all COMPLETED bookings to date rather than a rolling monthly window —
// simplification for now, easy to add a date filter later if the demo
// narrative wants a strict "this month" framing.
export async function getFairnessMetrics(req: Request, res: Response) {
  res.json(await computeFairnessMetrics(req.params.id));
}

// Requirement 4/34 — geo-spatial admin view: demand and available
// workforce grouped by society pincode. Demand counts every booking whose
// service address falls in that pincode (servicePincode is only populated
// once a booking has gone through the new address-aware create flow —
// older/seeded bookings without it are simply not counted, not
// fabricated into a bucket). Available workers are grouped by their
// society's own pincode, since workers don't carry an independent one.
export async function getGeoDemand(req: Request, res: Response) {
  const federationId = req.params.id;

  const [societies, demandRows] = await Promise.all([
    prisma.society.findMany({
      where: { federationId },
      include: {
        workers: { where: { verificationStatus: "VERIFIED" }, select: { id: true } },
      },
    }),
    prisma.booking.groupBy({
      by: ["servicePincode"],
      where: {
        worker: { society: { federationId } },
        servicePincode: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const demandByPincode = new Map(
    demandRows.map((r) => [r.servicePincode as string, r._count._all])
  );

  const rows = societies
    .filter((s) => !!s.pincode)
    .map((s) => ({
      pincode: s.pincode as string,
      society: s.name,
      availableWorkers: s.workers.length,
      demand: demandByPincode.get(s.pincode as string) ?? 0,
    }));

  res.json(rows);
}

// Dispatch analytics (§40-41) — the platform-intelligence story the
// dispatch model demo is built around. Assignment latency is only
// computable for bookings that actually have both broadcastAt and
// assignedAt (i.e. reached ASSIGNED or later) — still-searching
// (REQUESTED) bookings can't be federation-scoped through the worker
// relation since they have no worker yet, so they're scoped by whether
// their servicePincode matches one of this federation's societies
// instead (a best-effort join, not a persisted FK — see the schema
// comment on Booking.eligibleWorkerCount for why no join table exists).
export async function getDispatchAnalytics(req: Request, res: Response) {
  const federationId = req.params.id;

  const societies = await prisma.society.findMany({
    where: { federationId },
    select: { pincode: true },
  });
  const pincodes = societies.map((s) => s.pincode).filter((p): p is string => !!p);

  const [assignedOrLater, stillSearching, workersAvailable, workersBusy] = await Promise.all([
    prisma.booking.findMany({
      where: { worker: { society: { federationId } }, broadcastAt: { not: null }, assignedAt: { not: null } },
      select: { broadcastAt: true, assignedAt: true },
    }),
    prisma.booking.count({
      where: { status: "REQUESTED", workerId: null, servicePincode: { in: pincodes } },
    }),
    prisma.worker.count({
      where: { society: { federationId }, verificationStatus: "VERIFIED", availability: "AVAILABLE" },
    }),
    prisma.worker.count({
      where: { society: { federationId }, availability: "BUSY" },
    }),
  ]);

  const latenciesSeconds = assignedOrLater.map(
    (b) => (b.assignedAt!.getTime() - b.broadcastAt!.getTime()) / 1000
  );
  const avgAssignmentSeconds =
    latenciesSeconds.length > 0
      ? Math.round((latenciesSeconds.reduce((sum, s) => sum + s, 0) / latenciesSeconds.length) * 10) / 10
      : null;

  res.json({
    avgAssignmentSeconds,
    stillSearching,
    assigned: assignedOrLater.length,
    workersAvailable,
    workersBusy,
  });
}
