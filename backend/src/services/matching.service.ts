import { prisma } from "../lib/prisma";
import { haversineKm } from "../lib/geo";

// The single source of truth for "which workers can serve this booking,
// and in what order" (master prompt §8 — "create a dedicated dispatch/
// matching service rather than scattering matching logic across
// controllers").
//
// This module exists because that scattering had already produced a real
// bug: dispatch.service.ts's findEligibleWorkers (used for the socket
// broadcast) and booking.controller.ts's listIncomingRequests (used for
// the worker's REST feed) each implemented the pincode rule differently,
// so a worker could be pushed a job over Socket.io and then not find it
// in their own list.
//
// The root cause was that the old rule was *collective* — "if ANY worker
// covers this pincode, only pincode-matchers are eligible; otherwise fall
// back to a radius" — which cannot be evaluated for one worker in
// isolation. Every call site that only had one worker in hand had to
// approximate it, and the approximations disagreed.
//
// So the rule is now strictly *per-worker*: eligibility depends only on
// (this worker, this booking) and nothing else. Pincode did not stop
// mattering — it moved from being a hard gate to being the dominant
// ranking signal (see scoreWorker), which is what Requirement 4's
// "same-federation/society workers surfaced first" actually asks for.

export const MATCHING = {
  // Hard eligibility gate. A worker outside this radius is not offered
  // the job at all, unless their society covers the exact pincode.
  coverageRadiusKm: 25,
  // Ranking weights. They sum to 100 so a score reads as a percentage.
  weights: {
    pincode: 40,
    distance: 30,
    rating: 20,
    workload: 10,
  },
  // Distance at which the distance component decays to zero.
  distanceDecayKm: 25,
  // Jobs-today count at which the workload component decays to zero.
  // Not a cap on how much a worker may take — only the point past which
  // spreading work to someone else stops improving the score.
  workloadSaturation: 4,
} as const;

export interface MatchContext {
  serviceCategory: string;
  servicePincode: string | null | undefined;
  latitude: number;
  longitude: number;
}

export interface CandidateWorker {
  id: string;
  userId: string;
  latitude: number | null;
  longitude: number | null;
  ratingAvg: number;
  societyPincode: string | null;
  /** Jobs this worker has already been assigned today — the fair-allocation input. */
  jobsToday: number;
}

/** Named, inspectable reasons a worker ranked where they did (§24, §40 — "make the recommendation explainable"). */
export interface MatchBreakdown {
  pincodeMatch: boolean;
  distanceKm: number | null;
  ratingAvg: number;
  jobsToday: number;
  score: number;
}

export interface RankedWorker extends CandidateWorker, MatchBreakdown {}

export function distanceKmFor(worker: CandidateWorker, ctx: MatchContext): number | null {
  if (worker.latitude == null || worker.longitude == null) return null;
  return haversineKm(ctx.latitude, ctx.longitude, worker.latitude, worker.longitude);
}

export function isPincodeMatch(worker: CandidateWorker, ctx: MatchContext): boolean {
  return !!ctx.servicePincode && worker.societyPincode === ctx.servicePincode;
}

// The one eligibility predicate. Pure, per-worker, no dependency on who
// else happens to be eligible — which is exactly what makes the broadcast
// and the worker's own feed agree by construction.
//
// A worker whose society covers the pincode stays eligible even with no
// coordinates on file: pincode coverage is itself a statement about
// service area, and dropping such a worker would silently shrink the
// available workforce for a booking they genuinely serve.
export function isEligible(worker: CandidateWorker, ctx: MatchContext): boolean {
  if (isPincodeMatch(worker, ctx)) return true;
  const distance = distanceKmFor(worker, ctx);
  return distance != null && distance <= MATCHING.coverageRadiusKm;
}

// Explainable score in 0..100. Every component is a named factor rather
// than a tuned magic constant, so a new signal (reliability, historical
// acceptance rate, certification depth — §8) is added by extending this
// function and its weights, not by rewriting call sites.
export function scoreWorker(worker: CandidateWorker, ctx: MatchContext): MatchBreakdown {
  const { weights } = MATCHING;
  const pincodeMatch = isPincodeMatch(worker, ctx);
  const distanceKm = distanceKmFor(worker, ctx);

  const distanceComponent =
    distanceKm == null
      ? 0
      : weights.distance * Math.max(0, 1 - distanceKm / MATCHING.distanceDecayKm);

  // ratingAvg is 0 for a worker who has never been rated. Treating that
  // as "worst possible" would lock new workers out of good rankings
  // forever, so an unrated worker scores at the midpoint instead.
  const normalisedRating = worker.ratingAvg > 0 ? worker.ratingAvg / 5 : 0.5;

  // Fair allocation (§40) — a worker who has already picked up several
  // jobs today ranks below an equally-matched worker who hasn't, so work
  // spreads across the society instead of concentrating on whoever
  // happens to rank highest on every other axis.
  const workloadComponent =
    weights.workload * Math.max(0, 1 - worker.jobsToday / MATCHING.workloadSaturation);

  const score =
    (pincodeMatch ? weights.pincode : 0) +
    distanceComponent +
    weights.rating * normalisedRating +
    workloadComponent;

  return {
    pincodeMatch,
    distanceKm: distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
    ratingAvg: worker.ratingAvg,
    jobsToday: worker.jobsToday,
    score: Math.round(score * 10) / 10,
  };
}

export function rankWorkers(workers: CandidateWorker[], ctx: MatchContext): RankedWorker[] {
  return workers
    .map((w) => ({ ...w, ...scoreWorker(w, ctx) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * How many bookings each of these workers has been assigned since local
 * midnight — the workload input to fair allocation. One grouped query
 * rather than a per-worker count.
 */
export async function jobsTodayByWorker(workerIds: string[]): Promise<Map<string, number>> {
  if (workerIds.length === 0) return new Map();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const rows = await prisma.booking.groupBy({
    by: ["workerId"],
    where: {
      workerId: { in: workerIds },
      assignedAt: { gte: startOfToday },
    },
    _count: { _all: true },
  });

  return new Map(rows.map((r) => [r.workerId!, r._count._all]));
}

/**
 * Every verified, suitably-skilled worker — before the location gate.
 *
 * `includeUnavailable` is what separates *dispatch* from *coverage*.
 * Dispatch may only offer a job to someone free to take it right now, so
 * it leaves this false. Service-catalog coverage is answering a different
 * question — "does this federation serve this area at all" — and a
 * service is still offered here even if every local worker happens to be
 * mid-job, so it passes true.
 */
export async function loadCandidates(
  serviceCategory: string,
  { includeUnavailable = false }: { includeUnavailable?: boolean } = {}
): Promise<CandidateWorker[]> {
  const rows = await prisma.worker.findMany({
    where: {
      verificationStatus: "VERIFIED",
      ...(includeUnavailable ? {} : { availability: "AVAILABLE" as const }),
      skills: { has: serviceCategory },
    },
    select: {
      id: true,
      userId: true,
      latitude: true,
      longitude: true,
      ratingAvg: true,
      society: { select: { pincode: true } },
    },
  });

  const jobsToday = await jobsTodayByWorker(rows.map((r) => r.id));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    latitude: r.latitude,
    longitude: r.longitude,
    ratingAvg: r.ratingAvg,
    societyPincode: r.society.pincode,
    jobsToday: jobsToday.get(r.id) ?? 0,
  }));
}

/**
 * The workers a booking should be offered to, best match first.
 * Used by the dispatch broadcast; `isEligible` alone is used by the
 * worker's own feed, so the two can never drift apart again.
 */
export async function findEligibleWorkers(ctx: MatchContext): Promise<RankedWorker[]> {
  const candidates = await loadCandidates(ctx.serviceCategory);
  return rankWorkers(
    candidates.filter((w) => isEligible(w, ctx)),
    ctx
  );
}
