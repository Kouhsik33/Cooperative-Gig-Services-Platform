import { Router } from "express";
import * as serviceController from "../controllers/service.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.get("/", requireAuth, catchAsync(serviceController.listServices));

export default router;
