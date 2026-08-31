import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

// Realtime — Part E. Events: booking:new, booking:statusUpdate,
// booking:emergency (Requirement 8 — emergency booking alerts).
//
// Rooms, joined on connection based on the authenticated user's role:
//   federation:<federationId>  — a FEDERATION_ADMIN's own federation
//   worker:<workerId>          — a WORKER's own Worker.id (not User.id,
//                                 since Booking.workerId references Worker)
//   customer:<userId>          — a CUSTOMER's own bookings
// Booking events are emitted to the relevant federation + worker rooms
// (and, on status updates, the customer room) from booking.controller.ts.

let io: SocketIOServer | undefined;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Missing access token"));
    }
    try {
      socket.data.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const user = socket.data.user as { id: string; role: string };

    if (user.role === "WORKER") {
      const worker = await prisma.worker.findUnique({ where: { userId: user.id } });
      if (worker) socket.join(`worker:${worker.id}`);
    } else if (user.role === "FEDERATION_ADMIN") {
      const admin = await prisma.user.findUnique({ where: { id: user.id } });
      if (admin?.federationId) socket.join(`federation:${admin.federationId}`);
    } else if (user.role === "CUSTOMER") {
      socket.join(`customer:${user.id}`);
    }
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }
  return io;
}
