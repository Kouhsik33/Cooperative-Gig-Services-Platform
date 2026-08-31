import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

// Mobile app (CUSTOMER/WORKER) — passwordless.
router.post("/otp/request", catchAsync(authController.requestLoginOtp));
router.post("/otp/verify", catchAsync(authController.verifyLoginOtp));
router.post("/register", catchAsync(authController.register));

// admin-web (FEDERATION_ADMIN) — unchanged phone+password login.
router.post("/login", catchAsync(authController.login));

router.post("/refresh", catchAsync(authController.refresh));
router.patch("/language", requireAuth, catchAsync(authController.updateLanguage));

export default router;
