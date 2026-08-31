import { Router } from "express";
import * as addressController from "../controllers/address.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.use(requireAuth, requireRole("CUSTOMER"));

router.get("/", catchAsync(addressController.listAddresses));
router.post("/", catchAsync(addressController.createAddress));
router.delete("/:id", catchAsync(addressController.deleteAddress));

export default router;
