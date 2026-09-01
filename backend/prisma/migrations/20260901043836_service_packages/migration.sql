-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "packageId" TEXT;

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "durationMinMinutes" INTEGER NOT NULL,
    "durationMaxMinutes" INTEGER NOT NULL,
    "inclusions" TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePackage_serviceId_tier_idx" ON "ServicePackage"("serviceId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackage_serviceId_name_key" ON "ServicePackage"("serviceId", "name");

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
