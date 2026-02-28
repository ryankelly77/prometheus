-- AlterTable
ALTER TABLE "AIInsight" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "detail" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "impact" TEXT,
ADD COLUMN     "insightType" VARCHAR(30),
ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "layer" VARCHAR(50),
ADD COLUMN     "recommendation" TEXT;

-- CreateIndex
CREATE INDEX "AIInsight_locationId_isCurrent_idx" ON "AIInsight"("locationId", "isCurrent");

-- CreateIndex
CREATE INDEX "AIInsight_locationId_batchId_idx" ON "AIInsight"("locationId", "batchId");
