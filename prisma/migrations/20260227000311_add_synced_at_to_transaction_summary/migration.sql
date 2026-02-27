-- AlterTable
ALTER TABLE "TransactionSummary" ADD COLUMN     "syncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TransactionSummary_locationId_syncedAt_idx" ON "TransactionSummary"("locationId", "syncedAt");
