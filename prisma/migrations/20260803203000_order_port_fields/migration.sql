-- AlterTable
ALTER TABLE "orders" ADD COLUMN "orderItems" JSONB,
ADD COLUMN "updatedBy" JSONB,
ADD COLUMN "calculated" BOOLEAN,
ADD COLUMN "completedBy" JSONB,
ADD COLUMN "completionRegistered" BOOLEAN,
ADD COLUMN "completionRegisteredAt" TIMESTAMP(3),
ADD COLUMN "employeePointsAwarded" DOUBLE PRECISION,
ADD COLUMN "waitressPointsAwarded" DOUBLE PRECISION,
ADD COLUMN "completedOrdersIncremented" BOOLEAN,
ADD COLUMN "registrationFixed" BOOLEAN,
ADD COLUMN "registrationFixedAt" TIMESTAMP(3),
ADD COLUMN "pointsAwardedOnFix" DOUBLE PRECISION,
ADD COLUMN "waitressActivityRegistered" BOOLEAN;

-- AlterTable
ALTER TABLE "used_stock" ADD COLUMN "deletedWithOrder" BOOLEAN,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT,
ADD COLUMN "deletedOrderId" TEXT;

-- AlterTable
ALTER TABLE "deletion_requests" ADD COLUMN "approvedBy" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "note" TEXT,
ADD COLUMN "deletedOrderId" TEXT;

-- AlterTable
ALTER TABLE "deletion_logs" ADD COLUMN "deletedOrderDocumentId" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employee_rank" ADD COLUMN "recalculatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "deleted_orders" ADD COLUMN "userId" TEXT,
ADD COLUMN "stockProcessingNote" TEXT,
ADD COLUMN "paymentStatus" TEXT,
ADD COLUMN "editRequest" JSONB,
ADD COLUMN "assignmentRequest" JSONB,
ADD COLUMN "notifications" JSONB,
ADD COLUMN "updatedBy" JSONB,
ADD COLUMN "calculated" BOOLEAN,
ADD COLUMN "completedBy" JSONB,
ADD COLUMN "completionRegistered" BOOLEAN,
ADD COLUMN "completionRegisteredAt" TIMESTAMP(3),
ADD COLUMN "employeePointsAwarded" DOUBLE PRECISION,
ADD COLUMN "waitressPointsAwarded" DOUBLE PRECISION,
ADD COLUMN "completedOrdersIncremented" BOOLEAN,
ADD COLUMN "registrationFixed" BOOLEAN,
ADD COLUMN "registrationFixedAt" TIMESTAMP(3),
ADD COLUMN "pointsAwardedOnFix" DOUBLE PRECISION,
ADD COLUMN "waitressActivityRegistered" BOOLEAN;
