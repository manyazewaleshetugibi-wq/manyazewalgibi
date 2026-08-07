/*
  Warnings:

  - The `serialNumber` column on the `entenfesCases` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "entenfesCases" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "userName" TEXT,
DROP COLUMN "serialNumber",
ADD COLUMN     "serialNumber" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "podcastGuests" ADD COLUMN     "additionalNotes" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "scheduledDate" TEXT,
ADD COLUMN     "scheduledTime" TEXT,
ADD COLUMN     "serialNumber" DOUBLE PRECISION,
ADD COLUMN     "workSector" TEXT;
