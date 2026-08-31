import { Router } from "express";
import * as federationController from "../controllers/federation.controller";
import {
  requireAuth,
  requireOwnFederation,
  requireRole,
} from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.use(requireAuth, requireRole("FEDERATION_ADMIN"));

router.get(
  "/:id/dashboard",
  requireOwnFederation,
  catchAsync(federationController.getDashboard)
);
router.get(
  "/:id/workers",
  requireOwnFederation,
  catchAsync(federationController.getFederationWorkers)
);
router.get(
  "/:id/bookings",
  requireOwnFederation,
  catchAsync(federationController.getFederationBookings)
);
router.get(
  "/:id/welfare-fund",
  requireOwnFederation,
  catchAsync(federationController.getWelfareFund)
);
router.get(
  "/:id/welfare-fund/transactions",
  requireOwnFederation,
  catchAsync(federationController.getWelfareFundTransactions)
);
router.get(
  "/:id/fairness-metrics",
  requireOwnFederation,
  catchAsync(federationController.getFairnessMetrics)
);
router.get(
  "/:id/geo-demand",
  requireOwnFederation,
  catchAsync(federationController.getGeoDemand)
);
router.get(
  "/:id/dispatch-analytics",
  requireOwnFederation,
  catchAsync(federationController.getDispatchAnalytics)
);

export default router;
