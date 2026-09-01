import { prisma } from "../lib/prisma";
import { notify } from "./notification.service";
import { emitBookingEvent } from "../socket/events";
import { env } from "../config/env";

// Booking expiry (master prompt §18/§34). `EXPIRED` existed in the
// BookingStatus enum but nothing ever produced it, so a booking nobody
// accepted stayed REQUESTED forever — the customer's app showed "Finding a
// professional..." indefinitely, and the federation's unassigned-booking
// count only ever grew.
//
// This sweeps them into a terminal state on a fixed interval. Deliberately
// an in-process timer rather than a job queue: there is exactly one backend
// process, the work is a single indexed UPDATE, and introducing a queue
// would add infrastructure the rest of the system doesn't need. If this
// ever runs multi-instance, move it behind a real scheduler — the sweep
// itself is already idempotent, so duplicate runs are harmless.

let timer: NodeJS.Timeout | undefined;

export async function expireStaleRequests(): Promise<number> {
  const cutoff = new Date(Date.now() - env.booking.requestTtlMinutes * 60_000);

  // Selected before updating so each affected customer can be told why
  // their booking stopped searching.
  const stale = await prisma.booking.findMany({
    where: { status: "REQUESTED", workerId: null, broadcastAt: { lt: cutoff } },
    select: { id: true, customerId: true, service: { select: { name: true } } },
  });
  if (stale.length === 0) return 0;

  await prisma.booking.updateMany({
    where: { id: { in: stale.map((b) => b.id) }, status: "REQUESTED", workerId: null },
    data: { status: "EXPIRED" },
  });

  for (const b of stale) {
    await notify({
      userId: b.customerId,
      type: "NO_WORKER_FOUND",
      bookingId: b.id,
      title: "Booking expired",
      body: `We couldn't find an available professional for your ${b.service.name}. You haven't been charged — please try booking again.`,
    });
    emitBookingEvent(
      "booking:statusUpdate",
      "",
      "",
      { id: b.id, status: "EXPIRED", workerId: null },
      b.customerId
    );
  }

  return stale.length;
}

export function startBookingExpirySweeper() {
  if (timer) return;
  const intervalMs = env.booking.expirySweepSeconds * 1000;
  timer = setInterval(() => {
    expireStaleRequests().catch((err) => {
      // A failed sweep must never take the process down — the next tick
      // retries, and nothing else depends on this having succeeded.
      console.error("[booking-expiry] sweep failed:", err);
    });
  }, intervalMs);
  // Don't hold the event loop open on shutdown.
  timer.unref();
}

export function stopBookingExpirySweeper() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
