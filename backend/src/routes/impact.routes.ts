import { Router } from "express";
import * as impactController from "../controllers/impact.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.get("/", requireAuth, catchAsync(impactController.getCooperativeImpact));

export default router;
