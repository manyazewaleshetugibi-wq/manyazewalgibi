-- AlterTable
ALTER TABLE "users" ADD COLUMN "department" TEXT,
ADD COLUMN "restaurantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "webAuthnChallenges_userId_key" ON "webAuthnChallenges"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_userId_date_key" ON "attendance"("userId", "date");
