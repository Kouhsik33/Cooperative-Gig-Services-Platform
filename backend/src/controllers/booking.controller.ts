import { Request, Response } from "express";
import { OtpPurpose } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { haversineKm } from "../lib/geo";
import { computeWageSplit } from "../services/wageSplit";
import { emitBookingEvent, emitOtpReady } from "../socket/events";
import { requestOtp, verifyOtp } from "../services/otp.service";
import {
  broadcastBooking,
  findEligibleWorkers,
  notifyLosingWorkers,
} from "../services/dispatch.service";

// Bookings — Part E, Requirements 3, 8, rebuilt around the dispatch model
// (SIH26089 update §8-25): the customer books a SERVICE, never a
// specific worker. A booking starts unassigned (workerId null, status
// REQUESTED), broadcast to every eligible worker, and the first to
// accept wins via an atomic claim (see acceptBooking). Everything past
// assignment (ON_THE_WAY → ARRIVED → OTP-gated IN_PROGRESS →
// COMPLETION_PENDING → OTP-gated COMPLETED) is unchanged from the
// previous phase.

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

  const split = computeWageSplit(service.basePrice, isEmergency);

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
    include: { service: true, customer: { select: { id: true, name: true } } },
  });

  if (eligible.length > 0) {
    const federationIds = await federationIdsForWorkers(eligible.map((w) => w.id));
    federationIds.forEach((federationId) =>
      broadcastBooking(
        {
          id: booking.id,
          serviceName: booking.service.name,
          isEmergency: booking.isEmergency,
          scheduledAt: booking.scheduledAt,
          workerShare: booking.workerShare,
          emergencyBonus: booking.emergencyBonus,
          latitude: booking.latitude,
          longitude: booking.longitude,
          servicePincode: booking.servicePincode,
        },
        eligible,
        federationId
      )
    );
  }

  res.status(201).json({ ...booking, workerId: null });
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

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { eligibleWorkerCount: eligible.length, broadcastAt: new Date() },
  });

  if (eligible.length > 0) {
    const federationIds = await federationIdsForWorkers(eligible.map((w) => w.id));
    federationIds.forEach((federationId) =>
      broadcastBooking(
        {
          id: booking.id,
          serviceName: booking.service.name,
          isEmergency: booking.isEmergency,
          scheduledAt: booking.scheduledAt,
          workerShare: booking.workerShare,
          emergencyBonus: booking.emergencyBonus,
          latitude: booking.latitude,
          longitude: booking.longitude,
          servicePincode: booking.servicePincode,
        },
        eligible,
        federationId
      )
    );
  }

  res.json({ ...updated, eligibleWorkerCount: eligible.length });
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

  const claim = await prisma.booking.updateMany({
    where: { id: booking.id, status: "REQUESTED", workerId: null },
    data: { status: "ASSIGNED", workerId: worker.id, assignedAt: new Date() },
  });
  if (claim.count === 0) {
    return res.status(409).json({ error: "This request is no longer available." });
  }

  const [updated] = await prisma.$transaction([
    prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: {
        service: true,
        worker: { include: { user: { select: { id: true, name: true, phone: true } } } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.worker.update({ where: { id: worker.id }, data: { availability: "BUSY" } }),
  ]);

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

  res.json(updated);
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
  const { status } = req.body ?? {};
  if (typeof status !== "string") {
    return res.status(400).json({ error: "status is required" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { worker: { include: { society: true } }, payment: true },
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

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: status as never },
  });

  // A booking that already had a worker assigned frees them back up on
  // cancellation (§20 — AVAILABLE ↔ BUSY reflects real assignment state).
  if (status === "CANCELLED" && booking.workerId) {
    await prisma.worker.update({ where: { id: booking.workerId }, data: { availability: "AVAILABLE" } });
  }

  if (booking.worker) {
    emitBookingEvent(
      "booking:statusUpdate",
      booking.worker.society.federationId,
      booking.workerId!,
      { id: updated.id, status: updated.status, workerId: updated.workerId },
      booking.customerId
    );
  }

  // Reaching ARRIVED generates the service-start OTP the customer must
  // hand the worker (§19/§28). Demo accounts always get 0000 — see
  // otp.service.ts's isDemoPhone — which requires the customer's own
  // phone, not just the bookingId.
  if (status === "ARRIVED") {
    const customer = await prisma.user.findUnique({ where: { id: booking.customerId } });
    await requestOtp({
      purpose: OtpPurpose.SERVICE_START,
      bookingId: booking.id,
      phone: customer?.phone,
    });
    emitOtpReady(booking.customerId, booking.id, "SERVICE_START");
  }

  res.json(updated);
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
    include: { worker: { include: { society: true } }, payment: true },
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
    return res.json(updated);
  }

  // SERVICE_COMPLETION — same "must be paid" welfare-crediting gate as
  // before: completing an unpaid job still completes, it just doesn't
  // credit welfare for money never collected. Either way, the worker
  // frees up (BUSY -> AVAILABLE) since the job is done.
  const shouldCreditWelfare = booking.payment?.status === "paid";
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
    return res.json(updated);
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
  ]);

  emitBookingEvent(
    "booking:statusUpdate",
    federationId,
    booking.workerId!,
    { id: updated.id, status: updated.status, workerId: updated.workerId },
    booking.customerId
  );

  res.json(updated);
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

  res.json(updated);
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

  const candidates = await prisma.booking.findMany({
    where: {
      status: "REQUESTED",
      workerId: null,
      service: { category: { in: worker.skills } },
    },
    include: { service: true },
    orderBy: { isEmergency: "desc" },
  });

  const eligible = candidates.filter((b) => {
    if (b.servicePincode) {
      if (worker.society.pincode) return b.servicePincode === worker.society.pincode;
    }
    if (worker.latitude == null || worker.longitude == null) return false;
    return haversineKm(b.latitude, b.longitude, worker.latitude, worker.longitude) <= 25;
  });

  res.json(
    eligible.map((b) => ({
      id: b.id,
      serviceName: b.service.name,
      isEmergency: b.isEmergency,
      scheduledAt: b.scheduledAt,
      workerShare: b.workerShare,
      emergencyBonus: b.emergencyBonus,
      servicePincode: b.servicePincode,
      distanceKm:
        worker.latitude != null && worker.longitude != null
          ? Math.round(haversineKm(b.latitude, b.longitude, worker.latitude, worker.longitude) * 10) / 10
          : null,
    }))
  );
}

export async function getBooking(req: Request, res: Response) {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      service: true,
      worker: { include: { user: { select: { id: true, name: true, phone: true } } } },
      customer: { select: { id: true, name: true, phone: true } },
      payment: true,
      rating: true,
    },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const isOwner =
    req.user!.id === booking.customerId || (!!booking.worker && req.user!.id === booking.worker.userId);
  if (req.user!.role !== "FEDERATION_ADMIN" && !isOwner) {
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
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(bookings);
}
