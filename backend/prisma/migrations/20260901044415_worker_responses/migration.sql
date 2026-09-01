-- CreateEnum
CREATE TYPE "WorkerResponseType" AS ENUM ('ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "BookingWorkerResponse" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "response" "WorkerResponseType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingWorkerResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingWorkerResponse_workerId_createdAt_idx" ON "BookingWorkerResponse"("workerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingWorkerResponse_bookingId_workerId_key" ON "BookingWorkerResponse"("bookingId", "workerId");

-- AddForeignKey
ALTER TABLE "BookingWorkerResponse" ADD CONSTRAINT "BookingWorkerResponse_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingWorkerResponse" ADD CONSTRAINT "BookingWorkerResponse_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
