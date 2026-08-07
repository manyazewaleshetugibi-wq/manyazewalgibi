-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "bookStockProcessed" BOOLEAN,
ADD COLUMN     "hasPartialStock" BOOLEAN,
ADD COLUMN     "pendingStockItems" JSONB,
ADD COLUMN     "stockProcessingError" TEXT,
ADD COLUMN     "stockProcessingFailedAt" TIMESTAMP(3);
