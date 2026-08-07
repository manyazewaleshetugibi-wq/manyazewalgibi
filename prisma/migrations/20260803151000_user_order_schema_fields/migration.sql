-- AlterTable
ALTER TABLE "users" ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "gender" TEXT,
ADD COLUMN "location" JSONB,
ADD COLUMN "registrationSource" TEXT,
ADD COLUMN "locationConsent" BOOLEAN,
ADD COLUMN "referralCode" TEXT,
ADD COLUMN "referredBy" TEXT,
ADD COLUMN "referralInfo" JSONB;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "userId" TEXT;

-- AlterTable
ALTER TABLE "itemCategories" ADD COLUMN "station" TEXT;

-- AlterTable
ALTER TABLE "referrals" ADD COLUMN "referrerId" TEXT,
ADD COLUMN "referredId" TEXT,
ADD COLUMN "referredEmail" TEXT,
ADD COLUMN "referredName" TEXT,
ADD COLUMN "status" TEXT,
ADD COLUMN "pointsAwarded" DOUBLE PRECISION;
