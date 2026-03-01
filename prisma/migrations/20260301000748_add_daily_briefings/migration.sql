-- CreateTable
CREATE TABLE "DailyBriefing" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "briefingDate" DATE NOT NULL,
    "alert" JSONB,
    "opportunity" JSONB,
    "inputData" JSONB,
    "model" TEXT,
    "tokensUsed" INTEGER,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyBriefing_locationId_idx" ON "DailyBriefing"("locationId");

-- CreateIndex
CREATE INDEX "DailyBriefing_briefingDate_idx" ON "DailyBriefing"("briefingDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBriefing_locationId_briefingDate_key" ON "DailyBriefing"("locationId", "briefingDate");

-- AddForeignKey
ALTER TABLE "DailyBriefing" ADD CONSTRAINT "DailyBriefing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
