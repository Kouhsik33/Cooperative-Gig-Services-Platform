import { Router } from "express";
import authRoutes from "./auth.routes";
import workerRoutes from "./worker.routes";
import federationRoutes from "./federation.routes";
import serviceRoutes from "./service.routes";
import bookingRoutes from "./booking.routes";
import paymentRoutes from "./payment.routes";
import forecastRoutes from "./forecast.routes";
import addressRoutes from "./address.routes";
import societyRoutes from "./society.routes";
import impactRoutes from "./impact.routes";
import notificationRoutes from "./notification.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/workers", workerRoutes);
router.use("/federations", federationRoutes);
router.use("/services", serviceRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payments", paymentRoutes);
router.use("/forecast", forecastRoutes);
router.use("/addresses", addressRoutes);
router.use("/societies", societyRoutes);
router.use("/impact", impactRoutes);
router.use("/notifications", notificationRoutes);

export default router;
