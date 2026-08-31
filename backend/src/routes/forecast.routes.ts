import { Router } from "express";
import * as forecastController from "../controllers/forecast.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.get(
  "/demand",
  requireAuth,
  requireRole("FEDERATION_ADMIN"),
  catchAsync(forecastController.getDemandForecast)
);

export default router;
