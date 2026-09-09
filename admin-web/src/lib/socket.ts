import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentToken: string | null = null;

export function connectSocket(token: string): Socket {
  // Reconnect if the token changed (e.g. after a silent access-token
  // refresh) — socket.io only checks auth on connect.
  if (socket && currentToken === token) return socket;
  if (socket) socket.disconnect();
  currentToken = token;
  socket = io("http://localhost:4000", { auth: { token } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}
