import { Router } from "express";
import * as workerController from "../controllers/worker.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.use(requireAuth);

router.post("/", catchAsync(workerController.createWorker));
router.get("/:id", catchAsync(workerController.getWorker));
router.patch("/:id/verify", catchAsync(workerController.verifyWorker));
router.patch("/:id/location", catchAsync(workerController.updateWorkerLocation));
router.patch("/:id/availability", catchAsync(workerController.updateAvailability));
router.get("/:id/welfare", catchAsync(workerController.getWorkerWelfare));

export default router;
