import { OtpPurpose } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { haversineKm } from "../lib/geo";
import { emitBookingEvent, emitBookingLocation, emitOtpReady } from "../socket/events";
import { requestOtp } from "./otp.service";
import { notify } from "./notification.service";

// Simulated live worker movement for the Swiggy/Rapido-style tracking
// view. Movement is SIMULATED and time-based — never real device GPS —
// so the demo runs identically every time.
//
// The authoritative position is a pure function of the booking's
// navFrom* snapshot + service coords + elapsed since navStartedAt (see
// computeTrackingState). The interval below only *pushes* that same
// value over Socket.io on a cadence; a client that reconnects mid-trip
// recomputes it from GET /bookings/:id/tracking and stays in sync.

export const NAV_DURATION_SECONDS = 45;
const TICK_MS = 2000;

const activeTimers = new Map<string, NodeJS.Timeout>();

export interface TrackingState {
  bookingId: string;
  latitude: number;
  longitude: number;
  etaSeconds: number;
  distanceKm: number;
  progress: number; // 0..1
  phase: "EN_ROUTE" | "ARRIVED";
}

interface NavBooking {
  id: string;
  latitude: number;
  longitude: number;
  navStartedAt: Date | null;
  navFromLat: number | null;
  navFromLng: number | null;
  navDurationSeconds: number | null;
  status: string;
}

// Pure: same inputs -> same point. `progress` eases in/out slightly so
// the marker doesn't start and stop abruptly, but total time is exact.
export function computeTrackingState(b: NavBooking): TrackingState | null {
  if (b.navStartedAt == null || b.navFromLat == null || b.navFromLng == null) {
    return null;
  }
  const durationSec = b.navDurationSeconds ?? NAV_DURATION_SECONDS;
  const elapsedSec = (Date.now() - b.navStartedAt.getTime()) / 1000;
  const linear = Math.min(1, Math.max(0, elapsedSec / durationSec));
  // smoothstep easing
  const progress = linear * linear * (3 - 2 * linear);

  const latitude = b.navFromLat + (b.latitude - b.navFromLat) * progress;
  const longitude = b.navFromLng + (b.longitude - b.navFromLng) * progress;

  const totalKm = haversineKm(b.navFromLat, b.navFromLng, b.latitude, b.longitude);
  const distanceKm = Math.round(totalKm * (1 - progress) * 100) / 100;
  const etaSeconds = Math.max(0, Math.round(durationSec * (1 - linear)));

  return {
    bookingId: b.id,
    latitude,
    longitude,
    etaSeconds,
    distanceKm,
    progress: Math.round(progress * 1000) / 1000,
    phase: linear >= 1 ? "ARRIVED" : "EN_ROUTE",
  };
}

async function loadNavBooking(bookingId: string): Promise<NavBooking | null> {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      navStartedAt: true,
      navFromLat: true,
      navFromLng: true,
      navDurationSeconds: true,
      status: true,
    },
  });
}

// The ON_THE_WAY -> ARRIVED transition + its side effects, in one place
// so both the timer finishing AND a worker tapping "I've arrived" early
// go through identical logic (status, WORKER_ARRIVED notification,
// statusUpdate emit, SERVICE_START OTP generation, otpReady emit).
export async function markArrived(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      worker: { include: { society: true } },
    },
  });
  if (!booking || !booking.worker) return;
  if (booking.status !== "ON_THE_WAY") return;

  stopTrackingSimulation(bookingId);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "ARRIVED" },
  });

  const federationId = booking.worker.society.federationId;

  emitBookingLocation(federationId, booking.workerId!, booking.customerId, {
    bookingId,
    latitude: booking.latitude,
    longitude: booking.longitude,
    etaSeconds: 0,
    distanceKm: 0,
    progress: 1,
    phase: "ARRIVED",
  });

  emitBookingEvent(
    "booking:statusUpdate",
    federationId,
    booking.workerId!,
    { id: updated.id, status: updated.status, workerId: updated.workerId },
    booking.customerId
  );

  const customer = await prisma.user.findUnique({ where: { id: booking.customerId } });
  await requestOtp({
    purpose: OtpPurpose.SERVICE_START,
    bookingId: booking.id,
    phone: customer?.phone,
  });
  emitOtpReady(booking.customerId, booking.id, "SERVICE_START");

  await notify({
    userId: booking.customerId,
    type: "WORKER_ARRIVED",
    bookingId: booking.id,
    title: "Your professional has arrived",
    body: `Share your 4-digit start code to begin ${booking.service.name}.`,
  });
}

async function tick(bookingId: string): Promise<void> {
  const b = await loadNavBooking(bookingId);
  if (!b || b.status !== "ON_THE_WAY") {
    stopTrackingSimulation(bookingId);
    return;
  }

  const state = computeTrackingState(b);
  if (!state) {
    stopTrackingSimulation(bookingId);
    return;
  }

  const worker = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { workerId: true, customerId: true, worker: { select: { society: { select: { federationId: true } } } } },
  });
  if (worker?.workerId && worker.worker) {
    emitBookingLocation(
      worker.worker.society.federationId,
      worker.workerId,
      worker.customerId,
      state
    );
  }

  if (state.progress >= 1 || state.phase === "ARRIVED") {
    await markArrived(bookingId);
  }
}

// Kick off (or resume) the simulated drive. Idempotent — a second call
// for the same booking is a no-op while a timer is already running.
export function startTrackingSimulation(bookingId: string): void {
  if (activeTimers.has(bookingId)) return;
  // Fire one tick immediately so the marker jumps to the start point,
  // then on the interval.
  void tick(bookingId);
  const timer = setInterval(() => void tick(bookingId), TICK_MS);
  activeTimers.set(bookingId, timer);
}

export function stopTrackingSimulation(bookingId: string): void {
  const timer = activeTimers.get(bookingId);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(bookingId);
  }
}

// Called by GET /bookings/:id/tracking. Returns the current computed
// position, and — belt and suspenders if the in-process timer was lost
// (backend restart mid-trip) — completes an overdue trip to ARRIVED.
export async function getTrackingState(bookingId: string): Promise<TrackingState | null> {
  const b = await loadNavBooking(bookingId);
  if (!b) return null;

  if (b.status !== "ON_THE_WAY") {
    // Nothing moving. If it already arrived/started, report the endpoint.
    if (["ARRIVED", "IN_PROGRESS", "COMPLETION_PENDING", "COMPLETED"].includes(b.status)) {
      return {
        bookingId: b.id,
        latitude: b.latitude,
        longitude: b.longitude,
        etaSeconds: 0,
        distanceKm: 0,
        progress: 1,
        phase: "ARRIVED",
      };
    }
    return null;
  }

  const state = computeTrackingState(b);
  if (state && state.progress >= 1) {
    await markArrived(bookingId);
    return { ...state, phase: "ARRIVED", progress: 1, etaSeconds: 0, distanceKm: 0 };
  }
  // Resume the timer if it isn't running (e.g. after a restart).
  if (!activeTimers.has(bookingId)) startTrackingSimulation(bookingId);
  return state;
}
