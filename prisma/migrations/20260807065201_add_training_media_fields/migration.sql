-- AlterTable
ALTER TABLE "trainings" ADD COLUMN     "error" TEXT,
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "fileSize" DOUBLE PRECISION,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "publicId" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT;
