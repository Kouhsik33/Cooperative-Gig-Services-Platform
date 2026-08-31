import { Router } from "express";
import * as societyController from "../controllers/society.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.get("/", requireAuth, catchAsync(societyController.listSocieties));

export default router;
