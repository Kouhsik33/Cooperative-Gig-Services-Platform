import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";
import { getSocket } from "./socket";

// Live worker position for the en-route tracking view. Movement is
// SIMULATED and deterministic (the backend interpolates a fixed path over
// ~45s) — this hook just reads it: one REST catch-up on mount, then the
// existing Socket.io connection's `booking:location` events. No second
// realtime system.

export interface TrackingState {
  bookingId: string;
  latitude: number;
  longitude: number;
  etaSeconds: number;
  distanceKm: number;
  progress: number;
  phase: "EN_ROUTE" | "ARRIVED";
}

interface TrackingResponse {
  bookingId: string;
  status: string;
  destination: { latitude: number; longitude: number };
  tracking: TrackingState | null;
}

export async function fetchTracking(bookingId: string): Promise<TrackingResponse> {
  const { data } = await apiClient.get<TrackingResponse>(`/bookings/${bookingId}/tracking`);
  return data;
}

// Returns the latest tracking state for a booking, kept live. `active`
// gates it so a screen only subscribes while the booking is actually
// ON_THE_WAY / just arrived.
export function useLiveTracking(bookingId: string, active: boolean): TrackingState | null {
  const [state, setState] = useState<TrackingState | null>(null);
  const bookingRef = useRef(bookingId);
  bookingRef.current = bookingId;

  const catchUp = useCallback(async () => {
    try {
      const res = await fetchTracking(bookingId);
      if (bookingRef.current !== bookingId) return;
      setState(res.tracking);
    } catch {
      // best-effort — the socket will fill in
    }
  }, [bookingId]);

  useEffect(() => {
    if (!active) {
      setState(null);
      return;
    }
    catchUp();

    const socket = getSocket();
    if (!socket) return;
    function onLocation(payload: TrackingState) {
      if (payload.bookingId === bookingRef.current) setState(payload);
    }
    socket.on("booking:location", onLocation);
    return () => {
      socket.off("booking:location", onLocation);
    };
  }, [active, bookingId, catchUp]);

  return state;
}
