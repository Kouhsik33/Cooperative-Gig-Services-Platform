import { Request, Response } from "express";
import { OtpPurpose, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { computeWageSplit } from "../services/wageSplit";
import { emitBookingEvent, emitOtpReady } from "../socket/events";
import { requestOtp, verifyOtp } from "../services/otp.service";
import {
  NAV_DURATION_SECONDS,
  getTrackingState,
  markArrived,
  startTrackingSimulation,
  stopTrackingSimulation,
} from "../services/trackingSimulator.service";
import { haversineKm } from "../lib/geo";
import {
  broadcastBooking,
  notifyLosingWorkers,
} from "../services/dispatch.service";
import {
  findEligibleWorkers,
  isEligible,
  jobsTodayByWorker,
  scoreWorker,
  type MatchContext,
  type RankedWorker,
} from "../services/matching.service";
import {
  notify,
  notifyFederationAdmins,
  notifyMany,
  userIdsForWorkers,
} from "../services/notification.service";
import { formatMoney } from "../lib/money";

// Bookings — Part E, Requirements 3, 8, rebuilt around the dispatch model
// (SIH26089 update §8-25): the customer books a SERVICE, never a
// specific worker. A booking starts unassigned (workerId null, status
// REQUESTED), broadcast to every eligible worker, and the first to
// accept wins via an atomic claim (see acceptBooking). Everything past
// assignment (ON_THE_WAY → ARRIVED → OTP-gated IN_PROGRESS →
// COMPLETION_PENDING → OTP-gated COMPLETED) is unchanged from the
// previous phase.

// The one canonical shape every booking endpoint hands back to the app.
// Both lifecycle-hub screens (BookingTrackingScreen, JobDetailScreen)
// take a mutation response and `setBooking(...)` it directly, then render
// booking.service.name / booking.customer.name / booking.worker.user.name.
// A mutation that returned a bare `prisma.booking.update()` (no include)
// therefore blanked those relations and crashed the screen with
// "Cannot read property 'name' of undefined". Route every booking
// response through this include so the shape never depends on which
// endpoint produced it.
const bookingClientInclude = {
  service: true,
  servicePackage: true,
  worker: { include: { user: { select: { id: true, name: true, phone: true } } } },
  customer: { select: { id: true, name: true, phone: true } },
  payment: true,
  rating: true,
} as const;

async function bookingForClient(id: string) {
  return prisma.booking.findUniqueOrThrow({
    where: { id },
    include: bookingClientInclude,
  });
}

async function createBookingInternal(
  req: Request,
  res: Response,
  isEmergency: boolean
) {
  if (req.user!.role !== "CUSTOMER") {
    return res.status(403).json({ error: "Only customers can create bookings" });
  }

  const {
    serviceId,
    packageId,
    scheduledAt,
    latitude,
    longitude,
    serviceAddressLine,
    serviceLandmark,
    servicePincode,
    contactName,
    contactPhone,
    instructions,
  } = req.body ?? {};
  if (!serviceId || !scheduledAt || typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({
      error: "serviceId, scheduledAt, latitude and longitude are required",
    });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return res.status(404).json({ error: "Service not found" });

  // Pricing is resolved entirely server-side. The client sends only which
  // package was chosen — never a price — so a tampered request cannot
  // change what is charged or what the worker is credited.
  let selectedPackage = null;
  if (packageId) {
    selectedPackage = await prisma.servicePackage.findUnique({ where: { id: packageId } });
    if (!selectedPackage) {
      return res.status(404).json({ error: "Service package not found" });
    }
    // A package belonging to a different service would silently price this
    // booking off an unrelated tier.
    if (selectedPackage.serviceId !== serviceId) {
      return res.status(400).json({ error: "That package does not belong to this service" });
    }
  }

  // One authoritative base figure feeding the one canonical split function.
  const basePrice = selectedPackage ? selectedPackage.price : service.basePrice;
  const split = computeWageSplit(basePrice, isEmergency);

  const eligible = await findEligibleWorkers({
    serviceCategory: service.category,
    servicePincode: servicePincode ?? null,
    latitude,
    longitude,
  });

  const booking = await prisma.booking.create({
    data: {
      customerId: req.user!.id,
      serviceId,
      packageId: selectedPackage?.id ?? null,
      isEmergency,
      scheduledAt: new Date(scheduledAt),
      latitude,
      longitude,
      serviceAddressLine: serviceAddressLine ?? null,
      serviceLandmark: serviceLandmark ?? null,
      servicePincode: servicePincode ?? null,
      contactName: contactName ?? null,
      contactPhone: contactPhone ?? null,
      instructions: instructions ?? null,
      totalAmount: split.totalAmount,
      workerShare: split.workerShare,
      federationFee: split.federationFee,
      welfareContribution: split.welfareContribution,
      emergencyBonus: split.emergencyBonus,
      eligibleWorkerCount: eligible.length,
      broadcastAt: new Date(),
    },
    include: {
      service: true,
      servicePackage: true,
      customer: { select: { id: true, name: true } },
    },
  });

  await announceBooking(booking, booking.service.name, eligible);
  await notifyOnBookingCreated(booking, eligible);

  res.status(201).json({ ...booking, workerId: null });
}

// Every party who should know a booking now exists (§19). Notifications
// are persisted, so this is also the audit trail for "who was told what,
// when" — see notification.service.ts.
async function notifyOnBookingCreated(
  booking: {
    id: string;
    customerId: string;
    isEmergency: boolean;
    service: { name: string };
  },
  eligible: RankedWorker[]
) {
  const label = booking.isEmergency ? "Emergency booking" : "Booking";

  await notify({
    userId: booking.customerId,
    type: eligible.length > 0 ? "BOOKING_CONFIRMED" : "NO_WORKER_FOUND",
    bookingId: booking.id,
    title: eligible.length > 0 ? `${label} confirmed` : "No professional available yet",
    body:
      eligible.length > 0
        ? `We're finding a verified professional for your ${booking.service.name}. ${eligible.length} nearby ${eligible.length === 1 ? "professional was" : "professionals were"} notified.`
        : `No verified professional is currently available near you for ${booking.service.name}. You can keep searching or try a different time.`,
  });

  if (eligible.length > 0) {
    const workerUserIds = await userIdsForWorkers(eligible.map((w) => w.id));
    await notifyMany(
      workerUserIds.map((userId) => ({
        userId,
        type: "NEW_REQUEST" as const,
        bookingId: booking.id,
        title: booking.isEmergency ? "🚨 Emergency job request" : "New job request",
        body: `${booking.service.name} — open your Jobs tab to accept.`,
      }))
    );
  }

  // The federation's operations desk hears about the two cases it can
  // actually act on: an emergency, and a booking nobody can serve.
  const federationIds = await federationIdsForWorkers(eligible.map((w) => w.id));
  for (const federationId of federationIds) {
    if (booking.isEmergency) {
      await notifyFederationAdmins(federationId, {
        type: "EMERGENCY_BOOKING",
        bookingId: booking.id,
        title: "Emergency booking raised",
        body: `${booking.service.name} — broadcast to ${eligible.length} available ${eligible.length === 1 ? "worker" : "workers"}.`,
      });
    }
  }
  if (eligible.length === 0) {
    // No eligible worker means no federation to scope through, so this
    // goes to every federation admin — the unserved-area signal is
    // exactly what workforce planning needs, and there is nobody else who
    // could route it more precisely.
    const allFederations = await prisma.federation.findMany({ select: { id: true } });
    for (const f of allFederations) {
      await notifyFederationAdmins(f.id, {
        type: "UNASSIGNED_BOOKING",
        bookingId: booking.id,
        title: "Booking with no available worker",
        body: `${booking.service.name} could not be matched to any available verified worker.`,
      });
    }
  }
}

// Tells every eligible worker (and their federation's admin room) about a
// booking that is looking for someone. Shared by first dispatch and
// re-dispatch so the two can't drift.
async function announceBooking(
  booking: {
    id: string;
    isEmergency: boolean;
    scheduledAt: Date;
    workerShare: number;
    emergencyBonus: number;
    servicePincode: string | null;
  },
  serviceName: string,
  eligible: RankedWorker[]
) {
  if (eligible.length === 0) return;
  const federationIds = await federationIdsForWorkers(eligible.map((w) => w.id));
  federationIds.forEach((federationId) =>
    broadcastBooking(
      {
        id: booking.id,
        serviceName,
        isEmergency: booking.isEmergency,
        scheduledAt: booking.scheduledAt,
        workerShare: booking.workerShare,
        emergencyBonus: booking.emergencyBonus,
        servicePincode: booking.servicePincode,
      },
      eligible,
      federationId
    )
  );
}

async function federationIdsForWorkers(workerIds: string[]): Promise<string[]> {
  if (workerIds.length === 0) return [];
  const workers = await prisma.worker.findMany({
    where: { id: { in: workerIds } },
    select: { society: { select: { federationId: true } } },
  });
  return Array.from(new Set(workers.map((w) => w.society.federationId)));
}

export async function createBooking(req: Request, res: Response) {
  return createBookingInternal(req, res, false);
}

// Requirement 8 — priority booking. Same dispatch mechanism as a normal
// booking; the only difference is the Part F fairness-rule surge, which
// flows entirely to whichever worker ends up winning the race.
export async function createEmergencyBooking(req: Request, res: Response) {
  return createBookingInternal(req, res, true);
}

// A worker re-requests dispatch for their own booking that's still
// searching (product-flow update §48 — "Keep searching"). Recomputes
// eligibility fresh (a worker who just came online, or finished another
// job, might be eligible now even if nobody was at creation time) and
// re-broadcasts.
export async function redispatchBooking(req: Request, res: Response) {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { service: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (booking.status !== "REQUESTED") {
    return res.status(400).json({ error: "This booking is no longer searching for a professional" });
  }

  const eligible = await findEligibleWorkers({
    serviceCategory: booking.service.category,
    servicePincode: booking.servicePincode,
    latitude: booking.latitude,
    longitude: booking.longitude,
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { eligibleWorkerCount: eligible.length, broadcastAt: new Date() },
  });

  await announceBooking(booking, booking.service.name, eligible);

  res.json(await bookingForClient(booking.id));
}

// The core dispatch rule (§14-16, §46): first eligible worker to accept
// wins. Race-safety comes from the WHERE clause on this single UPDATE —
// Postgres serializes concurrent updates to the same row, so only one
// of two simultaneous callers can ever find status still REQUESTED and
// workerId still null; the loser's updateMany matches zero rows and
// gets a clean 409, never a partial/duplicate assignment.
export async function acceptBooking(req: Request, res: Response) {
  const worker = await prisma.worker.findUnique({
    where: { userId: req.user!.id },
    include: { society: true },
  });
  if (!worker) return res.status(403).json({ error: "No worker profile for this account" });
  if (worker.verificationStatus !== "VERIFIED") {
    return res.status(403).json({ error: "Only verified workers can accept jobs" });
  }
  if (worker.availability !== "AVAILABLE") {
    return res.status(409).json({ error: "You're currently busy with another job" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { service: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.status !== "REQUESTED" || booking.workerId) {
    return res.status(409).json({ error: "This request is no longer available." });
  }
  if (!worker.skills.includes(booking.service.category)) {
    return res.status(403).json({ error: "This job is outside your skills" });
  }

  // Two atomic claims are needed, not one, and they guard different
  // things:
  //
  //   1. this worker is not already on a job  (one worker -> one booking)
  //   2. this booking has no worker yet       (one booking -> one worker)
  //
  // The availability check above is only a read, so on its own it cannot
  // stop the same worker from winning two *different* bookings pushed to
  // them at the same moment: both requests read AVAILABLE, both then claim
  // their own booking, and both set BUSY. That is not hypothetical — it
  // left two live bookings assigned to worker 9000000121 in this database.
  //
  // So the worker is locked first, by a conditional UPDATE that only one
  // concurrent caller can win, and released again if the booking claim
  // then fails. Taking the worker lock first (rather than the booking
  // first) matters: releasing a worker back to AVAILABLE is purely local,
  // whereas un-claiming a booking would race with every other worker
  // trying to accept it.
  const lock = await prisma.worker.updateMany({
    where: { id: worker.id, availability: "AVAILABLE" },
    data: { availability: "BUSY" },
  });
  if (lock.count === 0) {
    return res.status(409).json({ error: "You're currently busy with another job" });
  }

  const claim = await prisma.booking.updateMany({
    where: { id: booking.id, status: "REQUESTED", workerId: null },
    data: { status: "ASSIGNED", workerId: worker.id, assignedAt: new Date() },
  });
  if (claim.count === 0) {
    await prisma.worker.update({
      where: { id: worker.id },
      data: { availability: "AVAILABLE" },
    });
    return res.status(409).json({ error: "This request is no longer available." });
  }

  // Recorded alongside the assignment so accept/decline sit in one table
  // the federation can analyse. Never gates the assignment itself — the
  // atomic claim above already decided the outcome.
  await prisma.bookingWorkerResponse.upsert({
    where: { bookingId_workerId: { bookingId: booking.id, workerId: worker.id } },
    create: { bookingId: booking.id, workerId: worker.id, response: "ACCEPTED" },
    update: { response: "ACCEPTED" },
  });

  const updated = await bookingForClient(booking.id);

  const federationId = worker.society.federationId;

  emitBookingEvent(
    "booking:statusUpdate",
    federationId,
    worker.id,
    { id: updated.id, status: updated.status, workerId: updated.workerId },
    booking.customerId
  );

  // Tell every other eligible worker this request is gone (§14, §16) —
  // recomputed the same way it was at broadcast time, not persisted, so
  // this reflects who was actually still eligible just now.
  const stillEligible = await findEligibleWorkers({
    serviceCategory: booking.service.category,
    servicePincode: booking.servicePincode,
    latitude: booking.latitude,
    longitude: booking.longitude,
  });
  notifyLosingWorkers(booking.id, worker.id, stillEligible);

  await notify({
    userId: booking.customerId,
    type: "WORKER_ASSIGNED",
    bookingId: booking.id,
    title: "Professional assigned",
    body: `${updated.worker?.user.name ?? "A verified professional"} accepted your ${booking.service.name}.`,
  });

  const losingUserIds = await userIdsForWorkers(
    stillEligible.filter((w) => w.id !== worker.id).map((w) => w.id)
  );
  await notifyMany(
    losingUserIds.map((userId) => ({
      userId,
      type: "REQUEST_TAKEN_ELSEWHERE" as const,
      bookingId: booking.id,
      title: "Request already taken",
      body: `The ${booking.service.name} request was accepted by another professional.`,
    }))
  );

  res.json(updated);
}

// Rescheduling (master prompt §18). Allowed only while nobody has
// physically set out: once a worker is ON_THE_WAY, moving the slot would
// strand someone who is already travelling, so that is a cancel-and-rebook,
// not a reschedule.
const RESCHEDULABLE_STATUSES = ["REQUESTED", "ASSIGNED"];

export async function rescheduleBooking(req: Request, res: Response) {
  const { scheduledAt } = req.body ?? {};
  if (typeof scheduledAt !== "string") {
    return res.status(400).json({ error: "scheduledAt is required" });
  }
  const next = new Date(scheduledAt);
  if (Number.isNaN(next.getTime())) {
    return res.status(400).json({ error: "scheduledAt must be a valid date" });
  }
  if (next.getTime() < Date.now()) {
    return res.status(400).json({ error: "Cannot reschedule to a time in the past" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { service: true, worker: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const isCustomer = booking.customerId === req.user!.id;
  const isAdmin = req.user!.role === "FEDERATION_ADMIN";
  if (!isCustomer && !isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!RESCHEDULABLE_STATUSES.includes(booking.status)) {
    return res.status(400).json({
      error: `A ${booking.status.toLowerCase().replace(/_/g, " ")} booking can no longer be rescheduled`,
    });
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      scheduledAt: next,
      // Recorded once, on the first move, so this always means "the slot
      // originally agreed" rather than "the slot before the latest move".
      originalScheduledAt: booking.originalScheduledAt ?? booking.scheduledAt,
      rescheduleCount: { increment: 1 },
    },
  });

  // An assigned worker planned their day around the old slot.
  if (booking.worker) {
    await notify({
      userId: booking.worker.userId,
      type: "BOOKING_RESCHEDULED",
      bookingId: booking.id,
      title: "Job rescheduled",
      body: `${booking.service.name} moved to ${next.toLocaleString("en-IN")}.`,
    });
    emitBookingEvent(
      "booking:statusUpdate",
      (await prisma.society.findUniqueOrThrow({
        where: { id: booking.worker.societyId },
        select: { federationId: true },
      })).federationId,
      booking.workerId!,
      { id: updated.id, status: updated.status, workerId: updated.workerId },
      booking.customerId
    );
  }

  res.json(await bookingForClient(updated.id));
}

// A worker passes on a broadcast request (V3).
//
// Deliberately does NOT touch the booking: it stays REQUESTED, and every
// other eligible worker keeps seeing it. Only this worker's own feed is
// affected. Recorded server-side so the federation can see response
// behaviour, and so a decline survives the worker restarting the app.
export async function declineBooking(req: Request, res: Response) {
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.id } });
  if (!worker) return res.status(403).json({ error: "No worker profile for this account" });

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, workerId: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  // Declining something already assigned is meaningless; an assigned
  // worker who wants out must cancel, which has different consequences.
  if (booking.status !== "REQUESTED" || booking.workerId) {
    return res.status(409).json({ error: "This request is no longer open" });
  }

  const reason =
    typeof req.body?.reason === "string" && req.body.reason.trim()
      ? req.body.reason.trim().slice(0, 200)
      : null;

  await prisma.bookingWorkerResponse.upsert({
    where: { bookingId_workerId: { bookingId: booking.id, workerId: worker.id } },
    create: { bookingId: booking.id, workerId: worker.id, response: "DECLINED", reason },
    update: { response: "DECLINED", reason },
  });

  res.json({ ok: true, bookingId: booking.id, response: "DECLINED" });
}

// Explicit transition table (§28/§46 — "do not allow arbitrary status
// transitions"). IN_PROGRESS and COMPLETED are only reachable via
// verifyServiceOtp, gated by a customer-issued OTP. ASSIGNED itself is
// only reachable via acceptBooking's atomic claim, never this endpoint.
const PLAIN_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ["CANCELLED"],
  ACCEPTED: ["CANCELLED"], // legacy pre-dispatch bookings only
  ASSIGNED: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["CANCELLED"],
  IN_PROGRESS: ["COMPLETION_PENDING", "CANCELLED"],
  COMPLETION_PENDING: ["CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  EXPIRED: [],
};

export async function updateBookingStatus(req: Request, res: Response) {
  const { status, cancellationReason } = req.body ?? {};
  if (typeof status !== "string") {
    return res.status(400).json({ error: "status is required" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { worker: { include: { society: true } }, payment: true, service: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const isAssignedWorker = !!booking.worker && req.user!.id === booking.worker.userId;
  const isAdmin = req.user!.role === "FEDERATION_ADMIN";
  const isCustomer = req.user!.id === booking.customerId;

  const allowedFrom = PLAIN_TRANSITIONS[booking.status] ?? [];
  if (!allowedFrom.includes(status)) {
    return res.status(400).json({
      error: `Cannot move a ${booking.status} booking to ${status}`,
    });
  }

  const canTransition =
    status === "CANCELLED" ? isAssignedWorker || isCustomer || isAdmin : isAssignedWorker || isAdmin;
  if (!canTransition) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // "I've arrived" early (before the ~45s simulated drive finishes) goes
  // through the exact same path the timer uses on completion — status,
  // WORKER_ARRIVED notification, statusUpdate emit, SERVICE_START OTP.
  if (status === "ARRIVED") {
    await markArrived(booking.id);
    return res.json(await bookingForClient(booking.id));
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: status as never,
      // Cancellation accountability (§18). Recorded from the actor's own
      // authenticated role, never from the request body, so "the worker
      // cancelled" can't be asserted by the customer.
      ...(status === "CANCELLED"
        ? {
            cancelledAt: new Date(),
            cancelledByRole: req.user!.role as Role,
            cancellationReason:
              typeof cancellationReason === "string" && cancellationReason.trim()
                ? cancellationReason.trim().slice(0, 500)
                : null,
          }
        : {}),
    },
  });

  // A booking that already had a worker assigned frees them back up on
  // cancellation (§20 — AVAILABLE ↔ BUSY reflects real assignment state).
  if (status === "CANCELLED" && booking.workerId) {
    await prisma.worker.update({ where: { id: booking.workerId }, data: { availability: "AVAILABLE" } });
  }

  await notifyOnStatusChange(booking, updated.status, req.user!.role, updated.cancellationReason);

  if (booking.worker) {
    emitBookingEvent(
      "booking:statusUpdate",
      booking.worker.society.federationId,
      booking.workerId!,
      { id: updated.id, status: updated.status, workerId: updated.workerId },
      booking.customerId
    );
  }

  // Worker taps "Start navigating": snapshot their position now and
  // anchor the simulated drive. navFrom* is the worker's own coords if
  // on file, otherwise a point ~2km from the customer so the demo still
  // shows visible movement. Movement is SIMULATED (time-based), never
  // real GPS — see trackingSimulator.service.ts.
  if (status === "ON_THE_WAY" && booking.workerId) {
    const worker = await prisma.worker.findUnique({
      where: { id: booking.workerId },
      select: { latitude: true, longitude: true },
    });
    let fromLat = worker?.latitude ?? null;
    let fromLng = worker?.longitude ?? null;
    // No worker coords, or coincidentally identical to the destination —
    // offset ~2km north-east so travel is actually visible.
    if (
      fromLat == null ||
      fromLng == null ||
      haversineKm(fromLat, fromLng, booking.latitude, booking.longitude) < 0.2
    ) {
      fromLat = booking.latitude + 0.018;
      fromLng = booking.longitude + 0.018;
    }
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        navStartedAt: new Date(),
        navFromLat: fromLat,
        navFromLng: fromLng,
        navDurationSeconds: NAV_DURATION_SECONDS,
      },
    });
    startTrackingSimulation(booking.id);
  }

  if (status === "CANCELLED") {
    stopTrackingSimulation(booking.id);
  }

  res.json(await bookingForClient(updated.id));
}

// Who to tell about a plain status transition, and what to say (§19).
// Kept next to the transition table rather than inside it: the table is
// about what is *legal*, this is about who *cares*.
async function notifyOnStatusChange(
  booking: {
    id: string;
    customerId: string;
    workerId: string | null;
    service: { name: string };
    worker: { userId: string; society: { federationId: string } } | null;
  },
  status: string,
  actorRole: string,
  reason: string | null
) {
  if (status === "ON_THE_WAY" || status === "ARRIVED") {
    await notify({
      userId: booking.customerId,
      type: status === "ON_THE_WAY" ? "WORKER_ON_THE_WAY" : "WORKER_ARRIVED",
      bookingId: booking.id,
      title: status === "ON_THE_WAY" ? "Your professional is on the way" : "Your professional has arrived",
      body:
        status === "ON_THE_WAY"
          ? `They're heading to your location for ${booking.service.name}.`
          : `Share your 4-digit start code to begin ${booking.service.name}.`,
    });
    return;
  }

  if (status !== "CANCELLED") return;

  const suffix = reason ? ` Reason: ${reason}` : "";
  // Tell whichever side did not do the cancelling. Telling the actor what
  // they just did is noise, not a notification.
  const recipients: { userId: string; you: string }[] = [];
  if (actorRole !== "CUSTOMER") {
    recipients.push({ userId: booking.customerId, you: "Your booking" });
  }
  if (booking.worker && actorRole === "CUSTOMER") {
    recipients.push({ userId: booking.worker.userId, you: "Your job" });
  }

  await notifyMany(
    recipients.map((r) => ({
      userId: r.userId,
      type: "BOOKING_CANCELLED" as const,
      bookingId: booking.id,
      title: "Booking cancelled",
      body: `${r.you} for ${booking.service.name} was cancelled.${suffix}`,
    }))
  );

  // A worker dropping an already-accepted job is an operations event —
  // the federation needs to see the pattern, not just the single row.
  if (booking.worker && actorRole === "WORKER") {
    await notifyFederationAdmins(booking.worker.society.federationId, {
      type: "BOOKING_CANCELLED",
      bookingId: booking.id,
      title: "Worker cancelled an assigned job",
      body: `${booking.service.name} was cancelled after assignment.${suffix}`,
    });
  }
}

// Live tracking position for the en-route view. Both the customer and
// the assigned worker may read it (they see the same drive from two
// screens); the federation admin too. Returns null-ish when nothing is
// moving. Reconnecting mid-trip, a client calls this once to catch up,
// then follows the booking:location socket events.
export async function getBookingTracking(req: Request, res: Response) {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { worker: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const isCustomer = req.user!.id === booking.customerId;
  const isAssignedWorker = !!booking.worker && req.user!.id === booking.worker.userId;
  const isAdmin = req.user!.role === "FEDERATION_ADMIN";
  if (!isCustomer && !isAssignedWorker && !isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const state = await getTrackingState(booking.id);
  res.json({
    bookingId: booking.id,
    status: booking.status,
    destination: { latitude: booking.latitude, longitude: booking.longitude },
    tracking: state,
  });
}

// Requirement 19/25 — the customer's own view of the currently active
// service-start/completion OTP for their booking. Never exposed to the
// worker; the customer reads it and tells the worker verbally/in person.
export async function getServiceOtp(req: Request, res: Response) {
  const purpose = req.query.purpose as string | undefined;
  if (purpose !== "SERVICE_START" && purpose !== "SERVICE_COMPLETION") {
    return res.status(400).json({ error: "purpose must be SERVICE_START or SERVICE_COMPLETION" });
  }

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const otp = await prisma.otpVerification.findFirst({
    where: { bookingId: booking.id, purpose, verifiedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) {
    return res.status(404).json({ error: "No active code for this booking yet" });
  }
  res.json({ otp: otp.otp, expiresAt: otp.expiresAt });
}

// Requirement 19/20/25 — the worker submits the code the customer read
// out. Verified server-side against OtpVerification; a match transitions
// ARRIVED -> IN_PROGRESS (recording serviceStartedAt) or
// COMPLETION_PENDING -> COMPLETED (recording serviceCompletedAt,
// crediting the welfare fund, and freeing the worker back to AVAILABLE).
export async function verifyServiceOtp(req: Request, res: Response) {
  const { purpose, otp } = req.body ?? {};
  if (purpose !== "SERVICE_START" && purpose !== "SERVICE_COMPLETION") {
    return res.status(400).json({ error: "purpose must be SERVICE_START or SERVICE_COMPLETION" });
  }
  if (!otp) {
    return res.status(400).json({ error: "otp is required" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { worker: { include: { society: true } }, payment: true, service: true },
  });
  if (!booking || !booking.worker) return res.status(404).json({ error: "Booking not found" });

  const isAssignedWorker = req.user!.id === booking.worker.userId;
  const isAdmin = req.user!.role === "FEDERATION_ADMIN";
  if (!isAssignedWorker && !isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const expectedFromStatus = purpose === "SERVICE_START" ? "ARRIVED" : "COMPLETION_PENDING";
  if (booking.status !== expectedFromStatus) {
    return res.status(400).json({
      error: `Booking must be ${expectedFromStatus} to verify a ${purpose} code`,
    });
  }

  const result = await verifyOtp({
    purpose: purpose as OtpPurpose,
    bookingId: booking.id,
    otp,
  });
  if (!result.ok) {
    const message =
      result.reason === "expired"
        ? "This code has expired. Ask the customer to refresh it."
        : result.reason === "too_many_attempts"
        ? "Too many incorrect attempts."
        : "Incorrect OTP. Please ask the customer for the correct code.";
    return res.status(400).json({ error: message });
  }

  const federationId = booking.worker.society.federationId;

  if (purpose === "SERVICE_START") {
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "IN_PROGRESS", serviceStartedAt: new Date() },
    });
    emitBookingEvent(
      "booking:statusUpdate",
      federationId,
      booking.workerId!,
      { id: updated.id, status: updated.status, workerId: updated.workerId },
      booking.customerId
    );
    await notify({
      userId: booking.customerId,
      type: "SERVICE_STARTED",
      bookingId: booking.id,
      title: "Service started",
      body: `Work has begun on your ${booking.service.name}.`,
    });
    return res.json(await bookingForClient(updated.id));
  }

  // SERVICE_COMPLETION — same "must be paid" welfare-crediting gate as
  // before: completing an unpaid job still completes, it just doesn't
  // credit welfare for money never collected. Either way, the worker
  // frees up (BUSY -> AVAILABLE) since the job is done.
  //
  // "cod" counts as paid here: the customer chose cash-on-completion, and
  // this transition IS that completion — the money is collected in person
  // now, so welfare accrues exactly as it would for an online payment.
  const isCod = booking.payment?.status === "cod";
  const shouldCreditWelfare = booking.payment?.status === "paid" || isCod;
  if (!shouldCreditWelfare) {
    const [updated] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: "COMPLETED", serviceCompletedAt: new Date() },
      }),
      prisma.worker.update({ where: { id: booking.workerId! }, data: { availability: "AVAILABLE" } }),
    ]);
    emitBookingEvent(
      "booking:statusUpdate",
      federationId,
      booking.workerId!,
      { id: updated.id, status: updated.status, workerId: updated.workerId },
      booking.customerId
    );
    await notifyOnCompletion(booking, false);
    return res.json(await bookingForClient(updated.id));
  }

  const welfareFund = await prisma.welfareFund.findUnique({ where: { federationId } });
  if (!welfareFund) {
    return res
      .status(500)
      .json({ error: "No welfare fund configured for this worker's federation" });
  }

  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED", serviceCompletedAt: new Date() },
    }),
    prisma.welfareFundTransaction.create({
      data: {
        welfareFundId: welfareFund.id,
        workerId: booking.workerId!,
        bookingId: booking.id,
        amount: booking.welfareContribution,
        type: "contribution",
      },
    }),
    prisma.welfareFund.update({
      where: { id: welfareFund.id },
      data: { balance: { increment: booking.welfareContribution } },
    }),
    prisma.worker.update({ where: { id: booking.workerId! }, data: { availability: "AVAILABLE" } }),
    // Cash collected in person at completion — the COD payment is now
    // settled, so downstream UI that checks status === "paid" is correct.
    ...(isCod
      ? [
          prisma.payment.update({
            where: { bookingId: booking.id },
            data: { status: "paid", paidAt: new Date() },
          }),
        ]
      : []),
  ]);

  emitBookingEvent(
    "booking:statusUpdate",
    federationId,
    booking.workerId!,
    { id: updated.id, status: updated.status, workerId: updated.workerId },
    booking.customerId
  );

  await notifyOnCompletion(booking, true);

  res.json(await bookingForClient(updated.id));
}

// Both sides of a finished job (§19). The worker's earnings notification
// restates the exact Part F split rather than a lump sum, so the
// transparency promise holds even in a notification body.
async function notifyOnCompletion(
  booking: {
    id: string;
    customerId: string;
    workerShare: number;
    welfareContribution: number;
    service: { name: string };
    worker: { userId: string } | null;
  },
  welfareCredited: boolean
) {
  await notify({
    userId: booking.customerId,
    type: "SERVICE_COMPLETED",
    bookingId: booking.id,
    title: "Service completed",
    body: `Your ${booking.service.name} is done. Rate your professional to help the cooperative.`,
  });
  await notify({
    userId: booking.customerId,
    type: "RATING_REMINDER",
    bookingId: booking.id,
    title: "How did it go?",
    body: `Leave a rating for your ${booking.service.name}.`,
  });

  if (!booking.worker) return;

  await notify({
    userId: booking.worker.userId,
    type: "EARNINGS_CREDITED",
    bookingId: booking.id,
    title: `You earned ${formatMoney(booking.workerShare)}`,
    body: `${booking.service.name} completed.`,
  });

  // Only claimed when it actually happened — the welfare credit is gated
  // on the booking having been paid for (see the branch above), and
  // telling a worker money was set aside when it wasn't would be exactly
  // the kind of fake transparency this product exists to avoid.
  if (welfareCredited) {
    await notify({
      userId: booking.worker.userId,
      type: "WELFARE_CREDITED",
      bookingId: booking.id,
      title: `${formatMoney(booking.welfareContribution)} added to your welfare fund`,
      body: `From your ${booking.service.name}.`,
    });
  }
}

// Worker taps "Complete service" — moves IN_PROGRESS -> COMPLETION_PENDING
// and generates the completion OTP, mirroring how reaching ARRIVED
// generates the start OTP.
export async function requestCompletion(req: Request, res: Response) {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { worker: { include: { society: true } } },
  });
  if (!booking || !booking.worker) return res.status(404).json({ error: "Booking not found" });

  const isAssignedWorker = req.user!.id === booking.worker.userId;
  const isAdmin = req.user!.role === "FEDERATION_ADMIN";
  if (!isAssignedWorker && !isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (booking.status !== "IN_PROGRESS") {
    return res.status(400).json({ error: "Booking must be IN_PROGRESS to complete" });
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "COMPLETION_PENDING" },
  });

  const customer = await prisma.user.findUnique({ where: { id: booking.customerId } });
  await requestOtp({
    purpose: OtpPurpose.SERVICE_COMPLETION,
    bookingId: booking.id,
    phone: customer?.phone,
  });
  emitOtpReady(booking.customerId, booking.id, "SERVICE_COMPLETION");

  emitBookingEvent(
    "booking:statusUpdate",
    booking.worker.society.federationId,
    booking.workerId!,
    { id: updated.id, status: updated.status, workerId: updated.workerId },
    booking.customerId
  );

  res.json(await bookingForClient(updated.id));
}

// Dispatch model (§13/§24) — incoming broadcast requests for this
// worker: REQUESTED, unassigned, matching their skills and coverage
// area. Recomputed on read rather than persisted per-worker (no
// BookingWorkerRequest table — see the schema comment on
// Booking.eligibleWorkerCount).
export async function listIncomingRequests(req: Request, res: Response) {
  const worker = await prisma.worker.findUnique({
    where: { userId: req.user!.id },
    include: { society: true },
  });
  if (!worker || worker.verificationStatus !== "VERIFIED" || worker.availability !== "AVAILABLE") {
    return res.json([]);
  }

  // Requests this worker has explicitly passed on stay out of their feed
  // permanently, not just for the current session.
  const declined = await prisma.bookingWorkerResponse.findMany({
    where: { workerId: worker.id, response: "DECLINED" },
    select: { bookingId: true },
  });

  const candidates = await prisma.booking.findMany({
    where: {
      status: "REQUESTED",
      workerId: null,
      service: { category: { in: worker.skills } },
      id: { notIn: declined.map((d) => d.bookingId) },
    },
    include: { service: true, servicePackage: true },
  });

  // Same worker shape the broadcast side scores against, so this feed and
  // the Socket.io push agree by construction rather than by two people
  // remembering to keep two filters in sync.
  const self = {
    id: worker.id,
    userId: worker.userId,
    latitude: worker.latitude,
    longitude: worker.longitude,
    ratingAvg: worker.ratingAvg,
    societyPincode: worker.society.pincode,
    jobsToday: (await jobsTodayByWorker([worker.id])).get(worker.id) ?? 0,
  };

  const offers = candidates
    .map((b) => {
      const ctx: MatchContext = {
        serviceCategory: b.service.category,
        servicePincode: b.servicePincode,
        latitude: b.latitude,
        longitude: b.longitude,
      };
      return { booking: b, ctx, match: scoreWorker(self, ctx) };
    })
    .filter(({ ctx }) => isEligible(self, ctx))
    // Emergencies first (they carry the urgency premium and a customer
    // waiting right now), then by how well this worker matches the job.
    .sort((a, b) => {
      if (a.booking.isEmergency !== b.booking.isEmergency) return a.booking.isEmergency ? -1 : 1;
      return b.match.score - a.match.score;
    });

  res.json(
    offers.map(({ booking: b, match }) => ({
      id: b.id,
      serviceName: b.service.name,
      packageName: b.servicePackage?.name ?? null,
      isEmergency: b.isEmergency,
      scheduledAt: b.scheduledAt,
      workerShare: b.workerShare,
      emergencyBonus: b.emergencyBonus,
      servicePincode: b.servicePincode,
      distanceKm: match.distanceKm,
      matchScore: match.score,
      inYourArea: match.pincodeMatch,
      // How long the job is expected to take — a worker deciding whether
      // to accept needs to know what they are committing their afternoon
      // to, not just what it pays.
      // Package duration when one was chosen — that is what the worker is
      // actually committing their afternoon to.
      durationMinMinutes: b.servicePackage?.durationMinMinutes ?? b.service.durationMinMinutes,
      durationMaxMinutes: b.servicePackage?.durationMaxMinutes ?? b.service.durationMaxMinutes,
    }))
  );
}

export async function getBooking(req: Request, res: Response) {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      service: true,
      servicePackage: true,
      worker: { include: { user: { select: { id: true, name: true, phone: true } } } },
      customer: { select: { id: true, name: true, phone: true } },
      payment: true,
      rating: true,
    },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const isCustomer = req.user!.id === booking.customerId;
  const isAssignedWorker = !!booking.worker && req.user!.id === booking.worker.userId;
  const isAdmin = req.user!.role === "FEDERATION_ADMIN";

  // A worker who has *responded* to this booking (accepted then lost the
  // race, or accepted and later had it cancelled) can still open it — so
  // a "request taken elsewhere" / "booking cancelled" notification
  // resolves to a real screen instead of a 403 -> "Try again".
  let hasResponded = false;
  if (!isCustomer && !isAssignedWorker && !isAdmin && req.user!.role === "WORKER") {
    const worker = await prisma.worker.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (worker) {
      const response = await prisma.bookingWorkerResponse.findUnique({
        where: { bookingId_workerId: { bookingId: booking.id, workerId: worker.id } },
        select: { id: true },
      });
      hasResponded = !!response;
    }
  }

  if (!isCustomer && !isAssignedWorker && !isAdmin && !hasResponded) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(booking);
}

export async function listBookings(req: Request, res: Response) {
  let userId = req.query.userId as string | undefined;
  let role = req.query.role as string | undefined;

  // Non-admins can only ever list their own bookings, regardless of query params.
  if (req.user!.role !== "FEDERATION_ADMIN") {
    userId = req.user!.id;
    role = req.user!.role;
  }

  const where =
    role === "WORKER"
      ? { worker: { userId } }
      : role === "CUSTOMER"
      ? { customerId: userId }
      : {};

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      service: true,
      worker: { include: { user: { select: { id: true, name: true, phone: true } } } },
      // Included so the bookings list can tell an already-rated booking
      // from one still awaiting a rating — without it the app re-prompts
      // for a rating the customer has already given.
      rating: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(bookings);
}
