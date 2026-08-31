import { getIO } from "./index";

// Socket.io emission is a side effect of the request/response cycle, not
// its outcome — a booking create/update must still succeed and respond
// even if no admin/worker happens to be connected right now. Errors here
// are swallowed rather than surfaced to the HTTP caller.
export function emitBookingEvent(
  event: "booking:new" | "booking:emergency" | "booking:statusUpdate",
  federationId: string,
  workerId: string,
  payload: Record<string, unknown>,
  customerId?: string
) {
  try {
    const io = getIO();
    let target = io.to(`federation:${federationId}`).to(`worker:${workerId}`);
    if (customerId) {
      target = target.to(`customer:${customerId}`);
    }
    target.emit(event, payload);
  } catch {
    // Socket.io not critical to the request/response cycle.
  }
}

// A service-start or service-completion OTP was just generated for a
// booking (booking reached ARRIVED / COMPLETION_PENDING). Only tells the
// customer a code is ready — never carries the OTP itself over the
// socket; the customer fetches it via the authenticated
// GET /bookings/:id/service-otp.
export function emitOtpReady(
  customerId: string,
  bookingId: string,
  purpose: "SERVICE_START" | "SERVICE_COMPLETION"
) {
  try {
    getIO().to(`customer:${customerId}`).emit("booking:otpReady", { bookingId, purpose });
  } catch {
    // Non-critical.
  }
}

export function emitChatMessage(
  customerId: string,
  workerId: string,
  message: Record<string, unknown>
) {
  try {
    getIO()
      .to(`customer:${customerId}`)
      .to(`worker:${workerId}`)
      .emit("chat:message", message);
  } catch {
    // Non-critical.
  }
}
