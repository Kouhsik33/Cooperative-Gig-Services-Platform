import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "./apiConfig";

let socket: Socket | null = null;

// React Native's XHR-based polling transport can be flaky; forcing
// websocket-only avoids a well-known Socket.io-in-RN gotcha.
export function connectSocket(token: string): Socket {
  if (socket) return socket;
  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ["websocket"],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
