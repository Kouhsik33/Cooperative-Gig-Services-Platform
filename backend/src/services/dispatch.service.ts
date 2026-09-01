import { getIO } from "../socket";
import type { RankedWorker } from "./matching.service";

// Dispatch — "customer books a SERVICE, not a WORKER" (SIH26089 dispatch
// model update §8-25). A booking is created with no worker at all and
// broadcast to every eligible worker; the first to accept wins (see
// booking.controller.ts's acceptBooking for the atomic claim).
//
// This module is now purely the *transport* half of dispatch: who to tell
// and how. The "who is eligible, and in what order" half lives in
// matching.service.ts, which is the single source of truth shared with
// the worker's own request feed — see the comment at the top of that file
// for why the two were split apart.

export type { RankedWorker, MatchContext } from "./matching.service";
export {
  findEligibleWorkers,
  isEligible,
  scoreWorker,
  rankWorkers,
  loadCandidates,
  MATCHING,
} from "./matching.service";

interface BroadcastBookingParams {
  id: string;
  serviceName: string;
  isEmergency: boolean;
  scheduledAt: Date;
  workerShare: number;
  emergencyBonus: number;
  servicePincode: string | null;
}

// Pushes the (deliberately thin — §24, "should not see sensitive
// customer information unnecessarily before accepting") request summary
// to every eligible worker's own room, plus the federation room so the
// admin's live dispatch view can reflect it too.
//
// Every eligible worker is notified at once — first-accept-wins is the
// fairness mechanism, so withholding the request from lower-ranked
// workers would quietly turn ranking into rationing. Rank is carried in
// the payload instead, so a worker's feed can order by match quality.
export function broadcastBooking(
  booking: BroadcastBookingParams,
  workers: RankedWorker[],
  federationId: string
) {
  try {
    const io = getIO();
    workers.forEach((w) => {
      io.to(`worker:${w.id}`).emit("booking:dispatchRequest", {
        ...booking,
        distanceKm: w.distanceKm,
        matchScore: w.score,
      });
    });
    io.to(`federation:${federationId}`).emit("booking:dispatchBroadcast", {
      id: booking.id,
      eligibleWorkerCount: workers.length,
    });
  } catch {
    // Socket.io not critical to the request/response cycle.
  }
}

export function notifyLosingWorkers(
  bookingId: string,
  winnerId: string,
  workers: RankedWorker[]
) {
  try {
    const io = getIO();
    workers
      .filter((w) => w.id !== winnerId)
      .forEach((w) => {
        io.to(`worker:${w.id}`).emit("booking:noLongerAvailable", { id: bookingId });
      });
  } catch {
    // Non-critical.
  }
}
