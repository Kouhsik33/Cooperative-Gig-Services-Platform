-- AlterTable
ALTER TABLE "User" ADD COLUMN     "federationId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_federationId_fkey" FOREIGN KEY ("federationId") REFERENCES "Federation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
