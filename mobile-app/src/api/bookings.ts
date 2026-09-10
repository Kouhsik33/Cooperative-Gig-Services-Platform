import { apiClient } from "./client";
import { Booking, BookingStatus } from "./types";

// Dispatch model (SIH26089 update §8-16) — a booking is created for a
// SERVICE, never a specific worker; no workerId here at all. The backend
// broadcasts it to every eligible worker and the first to accept wins.
export interface CreateBookingPayload {
  serviceId: string;
  /** Chosen tier or primary task. The server resolves price from it — the app never sends money. */
  packageId?: string;
  /** Chosen task/problem IDs for multi-item bookings. */
  packageIds?: string[];
  scheduledAt: string;
  latitude: number;
  longitude: number;
  // Service address snapshot (product-flow update §8/§9) — independent of
  // the customer's saved addresses, attached to this booking only.
  serviceAddressLine?: string;
  serviceLandmark?: string;
  servicePincode?: string;
  contactName?: string;
  contactPhone?: string;
  instructions?: string;
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const { data } = await apiClient.post<Booking>("/bookings", payload);
  return data;
}

// Requirement 8 — applies the Part F emergency surge server-side. Same
// dispatch mechanism as a normal booking.
export async function createEmergencyBooking(
  payload: CreateBookingPayload
): Promise<Booking> {
  const { data } = await apiClient.post<Booking>("/bookings/emergency", payload);
  return data;
}

export async function listMyBookings(): Promise<Booking[]> {
  const { data } = await apiClient.get<Booking[]>("/bookings");
  return data;
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<Booking> {
  const { data } = await apiClient.patch<Booking>(
    `/bookings/${bookingId}/status`,
    { status }
  );
  return data;
}

export async function getBookingById(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.get<Booking>(`/bookings/${bookingId}`);
  return data;
}

// A customer's still-REQUESTED booking that hasn't found a worker yet —
// re-broadcasts to whoever is eligible right now (product-flow update
// §48's "Keep searching").
// Server-side decline (V3). Removes this request from THIS worker's feed
// permanently; the booking stays open for everyone else.
export async function declineBooking(bookingId: string, reason?: string): Promise<void> {
  await apiClient.post(`/bookings/${bookingId}/decline`, reason ? { reason } : {});
}

export async function redispatchBooking(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.post<Booking>(`/bookings/${bookingId}/redispatch`);
  return data;
}

export interface IncomingRequest {
  id: string;
  serviceName: string;
  isEmergency: boolean;
  scheduledAt: string;
  workerShare: number;
  emergencyBonus: number;
  servicePincode: string | null;
  distanceKm: number | null;
  packageName?: string | null;
  /** 0-100 match quality from matching.service.ts — drives feed ordering. */
  matchScore?: number;
  inYourArea?: boolean;
  durationMinMinutes?: number | null;
  durationMaxMinutes?: number | null;
}

// Worker-only — broadcast requests eligible for this worker right now
// (dispatch model §13/§24): deliberately thin, no customer name/address
// until they actually accept.
export async function listIncomingRequests(): Promise<IncomingRequest[]> {
  const { data } = await apiClient.get<IncomingRequest[]>("/bookings/dispatch/incoming");
  return data;
}

// The core "first accept wins" call (§14-16). A 409 means someone else
// already got it — the caller should treat that as "request unavailable",
// not a generic error.
export async function acceptBooking(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.post<Booking>(`/bookings/${bookingId}/accept`);
  return data;
}

// Worker taps "Complete service" — IN_PROGRESS -> COMPLETION_PENDING,
// generating the completion OTP server-side (product-flow update §25).
export async function requestCompletion(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.post<Booking>(`/bookings/${bookingId}/request-completion`);
  return data;
}

export type ServiceOtpPurpose = "SERVICE_START" | "SERVICE_COMPLETION";

// Customer-only — reads the currently active start/completion OTP for
// this booking so it can be shown on screen and read out to the worker.
export async function getServiceOtp(
  bookingId: string,
  purpose: ServiceOtpPurpose
): Promise<{ otp: string; expiresAt: string }> {
  const { data } = await apiClient.get(`/bookings/${bookingId}/service-otp`, {
    params: { purpose },
  });
  return data;
}

// Worker-only — submits the code the customer read out. Validated
// server-side; never trusted from the client (product-flow update §20).
export async function verifyServiceOtp(
  bookingId: string,
  purpose: ServiceOtpPurpose,
  otp: string
): Promise<Booking> {
  const { data } = await apiClient.post<Booking>(`/bookings/${bookingId}/service-otp/verify`, {
    purpose,
    otp,
  });
  return data;
}
