import { Request, Response } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

// Payments — Part E, Requirements 5, 12. Razorpay test mode.
//
// GAP: RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are empty by default (no real
// Razorpay test account is wired into this environment). When they're
// unset, createOrder falls back to a deterministic mock order so the
// booking->pay->rate flow is fully testable end to end without external
// credentials. Set real test keys to hit Razorpay's actual test API —
// no other code changes needed.
const razorpay =
  env.razorpay.keyId && env.razorpay.keySecret
    ? new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret })
    : null;

export async function createOrder(req: Request, res: Response) {
  const { bookingId } = req.body ?? {};
  if (!bookingId) {
    return res.status(400).json({ error: "bookingId is required" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (booking.payment?.status === "paid") {
    return res.status(409).json({ error: "This booking has already been paid" });
  }

  const amountPaise = Math.round(booking.totalAmount * 100);
  let razorpayOrderId: string;
  let isMock = false;

  if (razorpay) {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: booking.id,
    });
    razorpayOrderId = order.id;
  } else {
    isMock = true;
    razorpayOrderId = `order_mock_${booking.id.slice(0, 12)}`;
  }

  const payment = await prisma.payment.upsert({
    where: { bookingId: booking.id },
    create: { bookingId: booking.id, razorpayId: razorpayOrderId, status: "created" },
    update: { razorpayId: razorpayOrderId, status: "created" },
  });

  // Itemized breakdown — same numbers computed at booking creation
  // (Part F), so this matches FairPricingBreakdownScreen exactly.
  res.status(201).json({
    razorpayOrderId,
    razorpayKeyId: env.razorpay.keyId || null,
    isMock,
    amount: amountPaise,
    currency: "INR",
    breakdown: {
      totalAmount: booking.totalAmount,
      workerShare: booking.workerShare,
      federationFee: booking.federationFee,
      welfareContribution: booking.welfareContribution,
      emergencyBonus: booking.emergencyBonus,
    },
    paymentId: payment.id,
  });
}

type CaptureResult = "not_found" | "already_paid" | "captured";

// Shared core used by both the real Razorpay webhook and the demo-only
// simulate-callback endpoint below — "paid" is decided in exactly one
// place, regardless of which caller triggers it.
//
// NOTE: Payment has a single razorpayId column (Part D schema), but
// Razorpay uses distinct order_id/payment_id identifiers. razorpayId is
// kept pinned to the order id (not overwritten with a payment id) because
// it's the lookup key a replayed/redelivered webhook uses to find this
// row — clobbering it would break idempotency on retry. A real schema
// would carry both ids as separate columns.
//
// Welfare-fund crediting (Requirement 7) does NOT happen here — it's
// triggered by the booking's COMPLETED status transition instead (see
// booking.controller.ts), not by payment success. A paid booking that
// never gets marked COMPLETED never credits welfare.
async function capturePayment(orderId: string): Promise<CaptureResult> {
  const payment = await prisma.payment.findFirst({ where: { razorpayId: orderId } });
  if (!payment) return "not_found";
  if (payment.status === "paid") return "already_paid";

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "paid", paidAt: new Date() },
  });
  return "captured";
}

// Razorpay calls this directly (no user JWT) with a signed payload.
// GAP: signature verification only runs when RAZORPAY_WEBHOOK_SECRET is
// set — it's empty by default in .env.example. In this local/demo setup
// we set a dev secret and sign our simulated webhook calls with it (see
// verification notes), but ship with a real secret before going anywhere
// near production; without one, this endpoint would accept unsigned
// requests claiming any booking as paid.
export async function razorpayWebhook(req: Request, res: Response) {
  const webhookSecret = env.razorpay.webhookSecret;

  if (webhookSecret) {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const expected = req.rawBody
      ? crypto.createHmac("sha256", webhookSecret).update(req.rawBody).digest("hex")
      : undefined;
    if (!signature || !expected || signature !== expected) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }
  }

  const event = req.body?.event;
  const orderId: string | undefined = req.body?.payload?.payment?.entity?.order_id;

  if (event !== "payment.captured" || !orderId) {
    return res.status(200).json({ received: true });
  }

  const result = await capturePayment(orderId);
  if (result === "not_found") {
    return res.status(404).json({ error: "No matching payment for this order" });
  }
  res.status(200).json({ received: true, alreadyProcessed: result === "already_paid" });
}

// POST /api/payments/simulate-callback — not in Part E. A demo-only
// stand-in for Razorpay actually calling our webhook, so the mobile app
// has a real tappable end-to-end payment step without live Razorpay
// keys. Unlike the real webhook (which trusts Razorpay's HMAC signature
// instead of a user JWT, since Razorpay's servers don't hold one), this
// endpoint requires the caller to be authenticated as the booking's own
// customer, and refuses to run at all when real Razorpay credentials are
// configured — otherwise anyone could fake a real payment for free.
// It calls the exact same capturePayment() core as the real webhook, so
// nothing about "paid" is decided client-side or by a separate code path.
export async function simulateCallback(req: Request, res: Response) {
  if (razorpay) {
    return res.status(403).json({
      error: "Payment simulation is disabled when live Razorpay credentials are configured",
    });
  }

  const { bookingId } = req.body ?? {};
  if (!bookingId) {
    return res.status(400).json({ error: "bookingId is required" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.customerId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!booking.payment) {
    return res.status(400).json({
      error: "No payment order exists for this booking yet — call create-order first",
    });
  }

  const result = await capturePayment(booking.payment.razorpayId ?? "");
  if (result === "not_found") {
    return res.status(404).json({ error: "No matching payment order found" });
  }

  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  res.json({ alreadyProcessed: result === "already_paid", payment });
}

// Itemized invoice (Requirement 5) — worker share, federation fee, and
// welfare contribution as three separate line items, matching the same
// breakdown shown on FairPricingBreakdownScreen. JSON per Part E
// ("itemized PDF/JSON") — no PDF renderer wired up in this phase.
export async function getInvoice(req: Request, res: Response) {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.bookingId },
    include: {
      service: true,
      worker: { include: { user: { select: { id: true, name: true } } } },
      customer: { select: { id: true, name: true, phone: true } },
      payment: true,
    },
  });
  if (!booking || !booking.worker) return res.status(404).json({ error: "Booking not found" });

  const isOwner =
    req.user!.id === booking.customerId || req.user!.id === booking.worker.userId;
  if (req.user!.role !== "FEDERATION_ADMIN" && !isOwner) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json({
    invoiceId: `INV-${booking.id.slice(0, 8).toUpperCase()}`,
    bookingId: booking.id,
    issuedAt: booking.payment?.paidAt ?? null,
    customer: booking.customer,
    worker: { id: booking.worker.id, name: booking.worker.user.name },
    service: { name: booking.service.name, category: booking.service.category },
    isEmergency: booking.isEmergency,
    lineItems: {
      basePrice: booking.service.basePrice,
      emergencyBonus: booking.emergencyBonus,
      totalAmount: booking.totalAmount,
      workerShare: booking.workerShare,
      federationFee: booking.federationFee,
      welfareContribution: booking.welfareContribution,
    },
    paymentStatus: booking.payment?.status ?? "unpaid",
  });
}
