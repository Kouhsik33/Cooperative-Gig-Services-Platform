import { Router } from "express";
import * as bookingController from "../controllers/booking.controller";
import * as ratingController from "../controllers/rating.controller";
import * as chatController from "../controllers/chat.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { catchAsync } from "../lib/catchAsync";

const router = Router();

router.use(requireAuth);

router.post("/", catchAsync(bookingController.createBooking));
router.post("/emergency", catchAsync(bookingController.createEmergencyBooking));
router.get("/", catchAsync(bookingController.listBookings));
// Dispatch model — worker-side incoming broadcast requests. Must be
// registered before "/:id" so "dispatch" isn't parsed as a booking id.
router.get("/dispatch/incoming", catchAsync(bookingController.listIncomingRequests));
router.get("/:id", catchAsync(bookingController.getBooking));
router.post("/:id/accept", catchAsync(bookingController.acceptBooking));
router.post("/:id/decline", catchAsync(bookingController.declineBooking));
router.post("/:id/redispatch", catchAsync(bookingController.redispatchBooking));
router.patch("/:id/status", catchAsync(bookingController.updateBookingStatus));
router.post("/:id/reschedule", catchAsync(bookingController.rescheduleBooking));
router.post("/:id/request-completion", catchAsync(bookingController.requestCompletion));
router.get("/:id/service-otp", catchAsync(bookingController.getServiceOtp));
router.post("/:id/service-otp/verify", catchAsync(bookingController.verifyServiceOtp));
router.post("/:id/rating", catchAsync(ratingController.submitRating));
router.get("/:id/messages", catchAsync(chatController.listMessages));
router.post("/:id/messages", catchAsync(chatController.sendMessage));

export default router;
