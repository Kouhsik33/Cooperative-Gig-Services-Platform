import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { emitChatMessage } from "../socket/events";

// Worker <-> customer chat (product-flow update §22/§23; dispatch model
// update §31). Scoped to one booking, only reachable once a worker has
// actually been assigned — under the dispatch model that's exactly
// "workerId is set" (a booking with no worker yet is still REQUESTED/
// broadcasting, and nobody should be chatting about a job nobody has
// taken).
type ChatAccessError = { ok: false; status: number; message: string };
type ChatAccessOk = {
  ok: true;
  booking: NonNullable<Awaited<ReturnType<typeof loadBooking>>> & { workerId: string };
  isCustomer: boolean;
};

function loadBooking(bookingId: string) {
  return prisma.booking.findUnique({ where: { id: bookingId } });
}

async function checkChatAccess(req: Request): Promise<ChatAccessError | ChatAccessOk> {
  const booking = await loadBooking(req.params.id);
  if (!booking) return { ok: false, status: 404, message: "Not found" };

  if (!booking.workerId) {
    return { ok: false, status: 409, message: "Chat opens once a professional is assigned" };
  }

  const worker = await prisma.worker.findUnique({ where: { id: booking.workerId } });
  const isCustomer = req.user!.id === booking.customerId;
  const isWorker = !!worker && req.user!.id === worker.userId;
  if (!isCustomer && !isWorker) return { ok: false, status: 403, message: "Not found" };

  return { ok: true, booking: { ...booking, workerId: booking.workerId }, isCustomer };
}

export async function listMessages(req: Request, res: Response) {
  const result = await checkChatAccess(req);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.message });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { bookingId: result.booking.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(messages);
}

export async function sendMessage(req: Request, res: Response) {
  const { text } = req.body ?? {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const result = await checkChatAccess(req);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.message });
  }

  const message = await prisma.chatMessage.create({
    data: {
      bookingId: result.booking.id,
      senderId: req.user!.id,
      senderRole: req.user!.role as "CUSTOMER" | "WORKER",
      text: text.trim(),
    },
  });

  emitChatMessage(result.booking.customerId, result.booking.workerId, message);
  res.status(201).json(message);
}
