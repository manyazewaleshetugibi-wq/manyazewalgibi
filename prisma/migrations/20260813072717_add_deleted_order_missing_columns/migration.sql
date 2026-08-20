-- AlterTable
ALTER TABLE "deleted_orders" ADD COLUMN     "bookStockProcessed" BOOLEAN,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "hasPartialStock" BOOLEAN,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "pendingStockItems" JSONB,
ADD COLUMN     "stockProcessingError" TEXT,
ADD COLUMN     "stockProcessingFailedAt" TIMESTAMP(3),
ADD COLUMN     "transactionId" TEXT;
