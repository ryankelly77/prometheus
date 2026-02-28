-- CreateTable
CREATE TABLE "RestaurantProfile" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "restaurantType" VARCHAR(50),
    "conceptDescription" TEXT,
    "cuisineType" VARCHAR(100),
    "priceRange" VARCHAR(20),
    "seatingCapacity" INTEGER,
    "neighborhood" VARCHAR(200),
    "targetDemographic" TEXT,
    "selectedDescriptors" TEXT[],
    "userContext" TEXT[],
    "dataFacts" JSONB NOT NULL DEFAULT '{}',
    "factsUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightFeedback" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "rating" VARCHAR(20) NOT NULL,
    "userComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantProfile_locationId_key" ON "RestaurantProfile"("locationId");

-- CreateIndex
CREATE INDEX "RestaurantProfile_locationId_idx" ON "RestaurantProfile"("locationId");

-- CreateIndex
CREATE INDEX "InsightFeedback_locationId_idx" ON "InsightFeedback"("locationId");

-- CreateIndex
CREATE INDEX "InsightFeedback_insightId_idx" ON "InsightFeedback"("insightId");

-- AddForeignKey
ALTER TABLE "RestaurantProfile" ADD CONSTRAINT "RestaurantProfile_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightFeedback" ADD CONSTRAINT "InsightFeedback_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightFeedback" ADD CONSTRAINT "InsightFeedback_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "AIInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
