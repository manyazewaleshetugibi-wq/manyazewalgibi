-- DropIndex
DROP INDEX "webAuthnChallenges_userId_idx";

-- AlterTable
ALTER TABLE "entenfisApplications" ADD COLUMN     "adminNotes" TEXT;

-- AlterTable
ALTER TABLE "podcastApplications" ADD COLUMN     "adminNotes" TEXT;

-- CreateTable
CREATE TABLE "otherContacts" (
    "id" TEXT NOT NULL,
    "serialNumber" DOUBLE PRECISION,
    "fullName" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "location" TEXT,
    "reasonForCall" TEXT,
    "callType" TEXT,
    "message" TEXT,
    "followUpNeeded" BOOLEAN,
    "followUpDate" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "otherContacts_pkey" PRIMARY KEY ("id")
);
