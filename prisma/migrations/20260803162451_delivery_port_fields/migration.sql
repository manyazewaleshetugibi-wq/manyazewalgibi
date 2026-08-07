-- AlterTable
ALTER TABLE "employee_rank" ADD COLUMN     "acceptedOrders" DOUBLE PRECISION,
ADD COLUMN     "cancelledOrders" DOUBLE PRECISION,
ADD COLUMN     "deliveredOrders" DOUBLE PRECISION,
ADD COLUMN     "totalOrdersProcessed" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "transactionId" TEXT;
