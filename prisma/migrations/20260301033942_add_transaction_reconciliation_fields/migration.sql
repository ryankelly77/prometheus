-- AlterTable
ALTER TABLE "TransactionSummary" ADD COLUMN     "deferredRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "serviceCharges" DECIMAL(12,2) NOT NULL DEFAULT 0;
