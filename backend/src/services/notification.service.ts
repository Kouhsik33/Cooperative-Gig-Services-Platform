import { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getIO } from "../socket";

// Notifications (master prompt §19) — the missing half of the real-time
// story. Socket.io already pushed booking events to whoever happened to be
// connected; nothing was ever persisted, so a customer whose phone was
// locked when their professional arrived had no way to learn it had
// happened.
//
// Every notification is therefore written first and pushed second: the row
// is the record, the socket emit is only an optimisation for someone who
// is looking right now. A failed emit never fails the write.

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  bookingId?: string | null;
}

function push(userId: string, notification: unknown) {
  try {
    getIO().to(`user:${userId}`).emit("notification:new", notification);
  } catch {
    // Socket.io is never load-bearing — the row is already saved.
  }
}

export async function notify(input: NotificationInput) {
  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      bookingId: input.bookingId ?? null,
    },
  });
  push(row.userId, row);
  return row;
}

/** One insert for many recipients — used for dispatch fan-out. */
export async function notifyMany(inputs: NotificationInput[]) {
  if (inputs.length === 0) return;
  await prisma.notification.createMany({
    data: inputs.map((i) => ({
      userId: i.userId,
      type: i.type,
      title: i.title,
      body: i.body,
      bookingId: i.bookingId ?? null,
    })),
  });
  // createMany cannot return the created rows, so the live push carries an
  // equivalent shape. Clients treat `notification:new` as "something
  // arrived, refresh if you care about exact ids" rather than as the
  // authoritative record.
  inputs.forEach((i) =>
    push(i.userId, {
      type: i.type,
      title: i.title,
      body: i.body,
      bookingId: i.bookingId ?? null,
      createdAt: new Date().toISOString(),
      readAt: null,
    })
  );
}

/** Every admin of a federation — the operations-desk audience (§19). */
export async function notifyFederationAdmins(
  federationId: string,
  input: Omit<NotificationInput, "userId">
) {
  const admins = await prisma.user.findMany({
    where: { role: "FEDERATION_ADMIN", federationId },
    select: { id: true },
  });
  await notifyMany(admins.map((a) => ({ ...input, userId: a.id })));
}

/** Worker.id -> the User.id that owns it, since notifications address people. */
export async function userIdsForWorkers(workerIds: string[]): Promise<string[]> {
  if (workerIds.length === 0) return [];
  const rows = await prisma.worker.findMany({
    where: { id: { in: workerIds } },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
