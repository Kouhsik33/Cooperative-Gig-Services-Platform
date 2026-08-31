-- CreateEnum
CREATE TYPE "WorkerAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'ASSIGNED';

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_workerId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "broadcastAt" TIMESTAMP(3),
ADD COLUMN     "eligibleWorkerCount" INTEGER,
ALTER COLUMN "workerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "availability" "WorkerAvailability" NOT NULL DEFAULT 'AVAILABLE';

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
