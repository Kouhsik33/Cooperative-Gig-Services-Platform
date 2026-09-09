import { useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getSocket } from "./socket";

// One place for "keep this screen consistent with live booking state".
//
// The bug this fixes: screens each hand-wired their own socket listeners,
// and it drifted — some subscribed to booking:statusUpdate, some didn't,
// some reloaded on focus, some kept a stale useState snapshot forever. So
// a booking cancelled / completed / advanced by the other party (or by
// the tracking simulator) left screens frozen on old state.
//
// Any screen that shows anything derived from a booking's status should
// call this with its own reload function. It:
//   - reloads whenever the screen regains focus, and
//   - reloads on every booking lifecycle / dispatch socket event the
//     backend already emits (reusing the existing Socket.io connection —
//     no new events, no second realtime system).
//
// `reload` MUST be a useCallback so the effect isn't torn down every
// render.
const DEFAULT_EVENTS = [
  "booking:statusUpdate",
  "booking:new",
  "booking:dispatchRequest",
  "booking:noLongerAvailable",
  "booking:emergency",
];

export function useBookingSync(reload: () => void, extraEvents: string[] = []) {
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const events = [...DEFAULT_EVENTS, ...extraEvents];
    const handler = () => reload();
    events.forEach((e) => socket.on(e, handler));
    return () => events.forEach((e) => socket.off(e, handler));
    // extraEvents is expected to be a stable literal per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);
}
