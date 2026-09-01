import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.use(requireAuth);

router.get("/", catchAsync(notificationController.listNotifications));
router.post("/read-all", catchAsync(notificationController.markAllRead));
router.post("/:id/read", catchAsync(notificationController.markRead));

export default router;
