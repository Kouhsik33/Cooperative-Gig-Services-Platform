import { Router } from "express";
import * as paymentController from "../controllers/payment.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.post("/create-order", requireAuth, catchAsync(paymentController.createOrder));
// Razorpay calls this directly with its own signature, not a user JWT.
router.post("/webhook", catchAsync(paymentController.razorpayWebhook));
// Not in Part E — demo-only stand-in for the webhook, see payment.controller.ts.
router.post("/simulate-callback", requireAuth, catchAsync(paymentController.simulateCallback));
router.get("/:bookingId/invoice", requireAuth, catchAsync(paymentController.getInvoice));

export default router;
