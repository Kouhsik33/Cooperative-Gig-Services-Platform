import { prisma } from "../lib/prisma";
import { haversineKm } from "../lib/geo";
import { getIO } from "../socket";

// Dispatch — "customer books a SERVICE, not a WORKER" (SIH26089 dispatch
// model update §8-25). A booking is created with no worker at all and
// broadcast to every eligible worker; the first to accept wins (see
// booking.controller.ts's acceptBooking for the atomic claim). This
// module only answers "who is eligible" and "how do we tell them" — it
// never assigns anything itself.

const COVERAGE_RADIUS_KM = 25;

export interface EligibleWorker {
  id: string;
  userId: string;
  latitude: number | null;
  longitude: number | null;
}

// Eligibility (§11/§21/§22): verified, currently AVAILABLE, skilled in
// this service's category, and covering the booking's pincode. Pincode
// is the primary/mandatory filter per §22; when a booking has no
// pincode on file (legacy data) this falls back to a pure distance
// radius so the feature doesn't hard-fail, rather than matching every
// worker in the federation regardless of location.
export async function findEligibleWorkers(params: {
  serviceCategory: string;
  servicePincode: string | null | undefined;
  latitude: number;
  longitude: number;
}): Promise<EligibleWorker[]> {
  const { serviceCategory, servicePincode, latitude, longitude } = params;

  const candidates = await prisma.worker.findMany({
    where: {
      verificationStatus: "VERIFIED",
      availability: "AVAILABLE",
      skills: { has: serviceCategory },
    },
    select: {
      id: true,
      userId: true,
      latitude: true,
      longitude: true,
      society: { select: { pincode: true } },
    },
  });

  if (servicePincode) {
    const pincodeMatches = candidates.filter((w) => w.society.pincode === servicePincode);
    if (pincodeMatches.length > 0) return pincodeMatches;
  }

  // Fallback: no pincode on the booking, or no worker's society covers
  // that exact pincode — use distance instead of returning nobody.
  return candidates.filter(
    (w) =>
      w.latitude != null &&
      w.longitude != null &&
      haversineKm(latitude, longitude, w.latitude, w.longitude) <= COVERAGE_RADIUS_KM
  );
}

interface BroadcastBookingParams {
  id: string;
  serviceName: string;
  isEmergency: boolean;
  scheduledAt: Date;
  workerShare: number;
  emergencyBonus: number;
  latitude: number;
  longitude: number;
  servicePincode: string | null;
}

// Pushes the (deliberately thin — §24, "should not see sensitive
// customer information unnecessarily before accepting") request summary
// to every eligible worker's own room, plus the federation room so the
// admin's live dispatch view can reflect it too.
export function broadcastBooking(booking: BroadcastBookingParams, workers: EligibleWorker[], federationId: string) {
  try {
    const io = getIO();
    const payload = {
      id: booking.id,
      serviceName: booking.serviceName,
      isEmergency: booking.isEmergency,
      scheduledAt: booking.scheduledAt,
      workerShare: booking.workerShare,
      emergencyBonus: booking.emergencyBonus,
      servicePincode: booking.servicePincode,
    };
    workers.forEach((w) => {
      const distanceKm =
        w.latitude != null && w.longitude != null
          ? Math.round(haversineKm(booking.latitude, booking.longitude, w.latitude, w.longitude) * 10) / 10
          : null;
      io.to(`worker:${w.id}`).emit("booking:dispatchRequest", { ...payload, distanceKm });
    });
    io.to(`federation:${federationId}`).emit("booking:dispatchBroadcast", {
      id: booking.id,
      eligibleWorkerCount: workers.length,
    });
  } catch {
    // Socket.io not critical to the request/response cycle.
  }
}

export function notifyLosingWorkers(bookingId: string, winnerId: string, workers: EligibleWorker[]) {
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
