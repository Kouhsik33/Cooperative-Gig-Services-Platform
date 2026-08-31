import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Ratings — Part E, Requirement 6.

export async function submitRating(req: Request, res: Response) {
  const { stars, comment } = req.body ?? {};
  if (typeof stars !== "number" || stars < 1 || stars > 5) {
    return res
      .status(400)
      .json({ error: "stars must be a number between 1 and 5" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { rating: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user!.id) {
    return res
      .status(403)
      .json({ error: "Only the customer who booked this job can rate it" });
  }
  if (booking.status !== "COMPLETED") {
    return res
      .status(400)
      .json({ error: "Only completed bookings can be rated" });
  }
  if (booking.rating) {
    return res.status(409).json({ error: "This booking has already been rated" });
  }
  if (!booking.workerId) {
    // Can't actually happen — COMPLETED is only reachable with a worker
    // assigned — but keeps the next query's typing honest.
    return res.status(500).json({ error: "This booking has no assigned worker" });
  }

  const rating = await prisma.rating.create({
    data: { bookingId: booking.id, stars, comment: comment ?? null },
  });

  // Aggregate rating feeds the worker's visibility in matching
  // (Requirement 6 — better-rated workers surfaced higher).
  const workerRatings = await prisma.rating.findMany({
    where: { booking: { workerId: booking.workerId } },
  });
  const avg =
    workerRatings.reduce((sum, r) => sum + r.stars, 0) / workerRatings.length;

  const worker = await prisma.worker.update({
    where: { id: booking.workerId },
    data: { ratingAvg: Math.round(avg * 100) / 100 },
  });

  res.status(201).json({ rating, workerRatingAvg: worker.ratingAvg });
}
