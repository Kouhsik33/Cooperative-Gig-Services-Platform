-- CreateIndex
CREATE INDEX "Booking_status_workerId_idx" ON "Booking"("status", "workerId");

-- CreateIndex
CREATE INDEX "Booking_customerId_createdAt_idx" ON "Booking"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_workerId_createdAt_idx" ON "Booking"("workerId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_workerId_assignedAt_idx" ON "Booking"("workerId", "assignedAt");

-- CreateIndex
CREATE INDEX "Booking_servicePincode_idx" ON "Booking"("servicePincode");

-- CreateIndex
CREATE INDEX "Booking_scheduledAt_idx" ON "Booking"("scheduledAt");

-- CreateIndex
CREATE INDEX "CustomerAddress_customerId_idx" ON "CustomerAddress"("customerId");

-- CreateIndex
CREATE INDEX "Society_pincode_idx" ON "Society"("pincode");

-- CreateIndex
CREATE INDEX "WelfareFundTransaction_workerId_createdAt_idx" ON "WelfareFundTransaction"("workerId", "createdAt");

-- CreateIndex
CREATE INDEX "WelfareFundTransaction_welfareFundId_createdAt_idx" ON "WelfareFundTransaction"("welfareFundId", "createdAt");

-- CreateIndex
CREATE INDEX "Worker_verificationStatus_availability_idx" ON "Worker"("verificationStatus", "availability");

-- CreateIndex
CREATE INDEX "Worker_societyId_idx" ON "Worker"("societyId");
