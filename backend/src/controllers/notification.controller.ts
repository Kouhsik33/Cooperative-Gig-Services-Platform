import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Notifications — the caller's own inbox (master prompt §19). Always
// scoped to req.user; there is no way to read anyone else's, by design.

const PAGE_SIZE = 50;

export async function listNotifications(req: Request, res: Response) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
  ]);
  res.json({ notifications, unreadCount });
}

export async function markRead(req: Request, res: Response) {
  // updateMany, not update, so the userId scope is part of the WHERE
  // clause — a mismatched id simply affects zero rows rather than letting
  // one user mark another's notification read.
  const result = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count === 0) {
    return res.status(404).json({ error: "Notification not found" });
  }
  res.json({ ok: true });
}

export async function markAllRead(req: Request, res: Response) {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true, marked: result.count });
}
