-- AlterTable
ALTER TABLE "orders" ADD COLUMN "editRequest" JSONB,
ADD COLUMN "assignmentRequest" JSONB,
ADD COLUMN "notifications" JSONB,
ADD COLUMN "customerName" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "paymentStatus" TEXT;
