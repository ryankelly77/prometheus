-- CreateEnum
CREATE TYPE "PositionCategory" AS ENUM ('FOH', 'BOH');

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemSales" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "quantitySold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgPrice" DECIMAL(10,2),
    "foodCostActual" DECIMAL(12,2),
    "foodCostTheoretical" DECIMAL(12,2),
    "profitMargin" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemSales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborDetail" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "positionName" TEXT NOT NULL,
    "positionCategory" "PositionCategory" NOT NULL,
    "hoursScheduled" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "hoursWorked" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgHourlyRate" DECIMAL(8,2),
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionSummary" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "grossSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comps" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "voids" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashPayments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cardPayments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "giftCardPayments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherPayments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgCheckSize" DECIMAL(10,2),
    "avgTip" DECIMAL(10,2),
    "tipPercent" DECIMAL(5,2),
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorySales" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "categoryName" TEXT NOT NULL,
    "itemsSold" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "percentOfSales" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategorySales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightCache" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "periodType" "InsightPeriod" NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "cacheType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatingArea" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 0,
    "isOutdoor" BOOLEAN NOT NULL DEFAULT false,
    "weatherDependent" BOOLEAN NOT NULL DEFAULT false,
    "avgRevenuePerSeat" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatingArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuCategory_locationId_idx" ON "MenuCategory"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_locationId_externalId_key" ON "MenuCategory"("locationId", "externalId");

-- CreateIndex
CREATE INDEX "MenuItem_locationId_idx" ON "MenuItem"("locationId");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_locationId_externalId_key" ON "MenuItem"("locationId", "externalId");

-- CreateIndex
CREATE INDEX "MenuItemSales_locationId_weekStartDate_idx" ON "MenuItemSales"("locationId", "weekStartDate");

-- CreateIndex
CREATE INDEX "MenuItemSales_menuItemId_idx" ON "MenuItemSales"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemSales_locationId_menuItemId_weekStartDate_key" ON "MenuItemSales"("locationId", "menuItemId", "weekStartDate");

-- CreateIndex
CREATE INDEX "LaborDetail_locationId_date_idx" ON "LaborDetail"("locationId", "date");

-- CreateIndex
CREATE INDEX "LaborDetail_positionCategory_idx" ON "LaborDetail"("positionCategory");

-- CreateIndex
CREATE UNIQUE INDEX "LaborDetail_locationId_date_positionName_key" ON "LaborDetail"("locationId", "date", "positionName");

-- CreateIndex
CREATE INDEX "TransactionSummary_locationId_date_idx" ON "TransactionSummary"("locationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionSummary_locationId_date_key" ON "TransactionSummary"("locationId", "date");

-- CreateIndex
CREATE INDEX "CategorySales_locationId_date_idx" ON "CategorySales"("locationId", "date");

-- CreateIndex
CREATE INDEX "CategorySales_categoryName_idx" ON "CategorySales"("categoryName");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySales_locationId_date_categoryName_key" ON "CategorySales"("locationId", "date", "categoryName");

-- CreateIndex
CREATE INDEX "InsightCache_locationId_cacheType_idx" ON "InsightCache"("locationId", "cacheType");

-- CreateIndex
CREATE INDEX "InsightCache_expiresAt_idx" ON "InsightCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InsightCache_locationId_periodType_periodStart_cacheType_key" ON "InsightCache"("locationId", "periodType", "periodStart", "cacheType");

-- CreateIndex
CREATE INDEX "SeatingArea_locationId_idx" ON "SeatingArea"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatingArea_locationId_name_key" ON "SeatingArea"("locationId", "name");

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemSales" ADD CONSTRAINT "MenuItemSales_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemSales" ADD CONSTRAINT "MenuItemSales_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborDetail" ADD CONSTRAINT "LaborDetail_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionSummary" ADD CONSTRAINT "TransactionSummary_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySales" ADD CONSTRAINT "CategorySales_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightCache" ADD CONSTRAINT "InsightCache_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatingArea" ADD CONSTRAINT "SeatingArea_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
