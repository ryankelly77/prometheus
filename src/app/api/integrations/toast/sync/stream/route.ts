import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import prisma from "@/lib/prisma";
import { createToastClient } from "@/lib/integrations/toast/client";
import { getToastConfig } from "@/lib/integrations/toast/auth";
import {
  aggregateOrdersByDaypart,
  mapDaypartAggregatesToPrisma,
  aggregateOrdersToTransactions,
  mapTransactionAggregatesToPrisma,
  parseBusinessDate,
  resetDaypartDebugCounter,
  resetCategoryDebugCounter,
  resetExclusionCounters,
  resetVoidedOrdersCounter,
  resetVoidAndRefundCounters,
  getExclusionStats,
  getVoidedOrdersCount,
  getVoidAndRefundStats,
  getOrderExclusionStats,
  getRevenueMethodComparison,
  getDiscountStats,
  getRefundStats,
  type ToastConfigMappings,
} from "@/lib/integrations/toast/mappers/orders";

interface SyncProgress {
  phase: "connecting" | "fetching" | "processing" | "saving" | "complete" | "error";
  message: string;
  ordersProcessed: number;
  totalDays: number;
  currentDay: number;
  percentComplete: number;
  error?: string;
}

/**
 * GET /api/integrations/toast/sync/stream
 * Server-Sent Events endpoint for real-time sync progress
 */
export async function GET(request: NextRequest) {
  // Auth check
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof Response) {
    return auth;
  }

  const searchParams = request.nextUrl.searchParams;
  const integrationId = searchParams.get("integrationId");
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  if (!integrationId) {
    return new Response("Missing integrationId", { status: 400 });
  }

  // Verify integration belongs to user's organization
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    include: {
      location: {
        include: {
          restaurantGroup: true,
        },
      },
    },
  });

  if (!integration) {
    return new Response("Integration not found", { status: 404 });
  }

  if (integration.location.restaurantGroup.organizationId !== auth.membership.organizationId) {
    return new Response("Unauthorized", { status: 403 });
  }

  // Parse dates
  const endDate = endDateStr ? new Date(endDateStr) : new Date();
  const startDate = startDateStr
    ? new Date(startDateStr)
    : new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000); // Default 12 months

  // Calculate total days for progress
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: SyncProgress) => {
        const data = `data: ${JSON.stringify(progress)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        // Phase 1: Connecting
        sendProgress({
          phase: "connecting",
          message: "Connecting to Toast API...",
          ordersProcessed: 0,
          totalDays,
          currentDay: 0,
          percentComplete: 5,
        });

        const client = createToastClient(integrationId);
        const config = await getToastConfig(integrationId);

        if (!config?.restaurantGuid) {
          throw new Error("Toast integration not properly configured");
        }

        const configMappings: ToastConfigMappings = {
          salesCategories: config.salesCategories,
          restaurantServices: config.restaurantServices,
          revenueCenters: config.revenueCenters,
        };

        const locationId = integration.locationId;

        // Log requested date range
        console.log(`[Toast Sync] REQUESTED date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // Phase 2: Fetching orders
        sendProgress({
          phase: "fetching",
          message: `Fetching orders from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}...`,
          ordersProcessed: 0,
          totalDays,
          currentDay: 0,
          percentComplete: 10,
        });

        const rawOrders = await client.fetchAllOrders({ startDate, endDate });
        console.log(`[Toast Sync] Toast API returned ${rawOrders.length} orders`);

        // Filter orders to only include those within the requested date range
        // Toast sometimes returns orders outside the requested range
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

        let outsideRangeCount = 0;
        const orders = rawOrders.filter(order => {
          const orderDate = parseBusinessDate(order.businessDate);
          const isInRange = orderDate >= startDateOnly && orderDate <= endDateOnly;
          if (!isInRange) {
            outsideRangeCount++;
            if (outsideRangeCount <= 5) {
              console.log(`[Toast Sync] FILTERING OUT order ${order.guid} with businessDate ${order.businessDate} (${orderDate.toISOString().slice(0, 10)}) - outside requested range`);
            }
          }
          return isInRange;
        });

        if (outsideRangeCount > 0) {
          console.log(`[Toast Sync] FILTERED OUT ${outsideRangeCount} orders outside date range ${startDateOnly.toISOString().slice(0, 10)} to ${endDateOnly.toISOString().slice(0, 10)}`);
        }
        console.log(`[Toast Sync] Processing ${orders.length} orders after date filtering`);

        sendProgress({
          phase: "fetching",
          message: `Found ${orders.length} orders to process (filtered ${outsideRangeCount} outside range)`,
          ordersProcessed: orders.length,
          totalDays,
          currentDay: 0,
          percentComplete: 30,
        });

        if (orders.length === 0) {
          sendProgress({
            phase: "complete",
            message: "No orders found for this date range",
            ordersProcessed: 0,
            totalDays,
            currentDay: totalDays,
            percentComplete: 100,
          });

          await prisma.integration.update({
            where: { id: integrationId },
            data: {
              lastSyncAt: new Date(),
              lastSyncStatus: "SUCCESS",
              lastSyncError: null,
            },
          });

          controller.close();
          return;
        }

        // Phase 3: Processing orders
        sendProgress({
          phase: "processing",
          message: "Aggregating orders by daypart...",
          ordersProcessed: orders.length,
          totalDays,
          currentDay: 0,
          percentComplete: 40,
        });

        // Reset all debug and exclusion counters
        resetDaypartDebugCounter();
        resetCategoryDebugCounter();
        resetExclusionCounters();
        resetVoidedOrdersCounter();
        resetVoidAndRefundCounters();

        const daypartAggregates = aggregateOrdersByDaypart(orders, locationId, configMappings);
        const daypartRecords = mapDaypartAggregatesToPrisma(daypartAggregates, locationId);

        sendProgress({
          phase: "processing",
          message: `Processing ${daypartRecords.length} daypart records...`,
          ordersProcessed: orders.length,
          totalDays,
          currentDay: 0,
          percentComplete: 50,
        });

        const transactionAggregates = aggregateOrdersToTransactions(orders, configMappings);
        const transactionRecords = mapTransactionAggregatesToPrisma(transactionAggregates, locationId);

        // Phase 4: Saving to database
        sendProgress({
          phase: "saving",
          message: "Saving daypart metrics to database...",
          ordersProcessed: orders.length,
          totalDays,
          currentDay: 0,
          percentComplete: 60,
        });

        // Collect unique dates and delete stale daypart records
        const uniqueDates = new Set<string>();
        for (const record of daypartRecords) {
          const dateStr = record.date instanceof Date
            ? record.date.toISOString().slice(0, 10)
            : String(record.date).slice(0, 10);
          uniqueDates.add(dateStr);
        }

        let daysProcessed = 0;
        const totalUniqueDays = uniqueDates.size;

        for (const dateStr of uniqueDates) {
          const dateValue = new Date(dateStr + "T00:00:00.000Z");
          await prisma.daypartMetrics.deleteMany({
            where: {
              locationId,
              date: dateValue,
            },
          });
          daysProcessed++;

          if (daysProcessed % 10 === 0 || daysProcessed === totalUniqueDays) {
            sendProgress({
              phase: "saving",
              message: `Cleaning up old data: ${daysProcessed}/${totalUniqueDays} days...`,
              ordersProcessed: orders.length,
              totalDays: totalUniqueDays,
              currentDay: daysProcessed,
              percentComplete: 60 + Math.round((daysProcessed / totalUniqueDays) * 10),
            });
          }
        }

        // Insert fresh daypart records
        let recordsSaved = 0;
        for (const record of daypartRecords) {
          const { locationId: locId, date, daypart, ...createData } = record;
          await prisma.daypartMetrics.create({
            data: {
              location: { connect: { id: locId } },
              date,
              daypart,
              ...createData,
            },
          });
          recordsSaved++;

          if (recordsSaved % 20 === 0 || recordsSaved === daypartRecords.length) {
            sendProgress({
              phase: "saving",
              message: `Saving daypart records: ${recordsSaved}/${daypartRecords.length}...`,
              ordersProcessed: orders.length,
              totalDays: totalUniqueDays,
              currentDay: daysProcessed,
              percentComplete: 70 + Math.round((recordsSaved / daypartRecords.length) * 10),
            });
          }
        }

        // Save transaction summaries
        sendProgress({
          phase: "saving",
          message: "Saving transaction summaries...",
          ordersProcessed: orders.length,
          totalDays: totalUniqueDays,
          currentDay: totalUniqueDays,
          percentComplete: 85,
        });

        // Issue 1 debug: Log total being saved to DB
        const totalNetSalesBeingSaved = transactionRecords.reduce((sum, r) => sum + Number(r.netSales ?? 0), 0);
        const totalOrdersBeingSaved = transactionRecords.reduce((sum, r) => sum + Number(r.transactionCount ?? 0), 0);
        console.log(`[Toast Sync] DATABASE SAVE: Total net sales being saved: $${totalNetSalesBeingSaved.toFixed(2)}`);
        console.log(`[Toast Sync] DATABASE SAVE: Total order count being saved: ${totalOrdersBeingSaved}`);
        console.log(`[Toast Sync] DATABASE SAVE: Transaction records by day:`);
        for (const record of transactionRecords) {
          const dateStr = record.date instanceof Date ? record.date.toISOString().slice(0, 10) : String(record.date).slice(0, 10);
          console.log(`[Toast Sync]   ${dateStr}: ${record.transactionCount} orders, $${Number(record.netSales ?? 0).toFixed(2)} net`);
        }

        for (const record of transactionRecords) {
          const { locationId: locId, date, ...updateData } = record;
          const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
          console.log(`[Toast Sync] DB UPSERT: ${dateStr} netSales=$${Number(updateData.netSales ?? 0).toFixed(2)} grossSales=$${Number(updateData.grossSales ?? 0).toFixed(2)} orders=${updateData.transactionCount}`);
          await prisma.transactionSummary.upsert({
            where: {
              locationId_date: {
                locationId: locId,
                date,
              },
            },
            update: updateData,
            create: {
              location: { connect: { id: locId } },
              date,
              ...updateData,
            },
          });
        }

        // Update integration status
        await prisma.integration.update({
          where: { id: integrationId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: "SUCCESS",
            lastSyncError: null,
          },
        });

        // Calculate category totals for summary
        const categoryTotals = { food: 0, beer: 0, wine: 0, liquor: 0, nonAlc: 0, totalRevenue: 0 };
        for (const record of daypartRecords) {
          categoryTotals.food += Number(record.foodSales ?? 0);
          categoryTotals.beer += Number(record.beerSales ?? 0);
          categoryTotals.wine += Number(record.wineSales ?? 0);
          categoryTotals.liquor += Number(record.liquorSales ?? 0);
          categoryTotals.nonAlc += Number(record.nonAlcoholicBevSales ?? 0);
          categoryTotals.totalRevenue += Number(record.totalSales ?? 0);
        }
        const sumCategories = categoryTotals.food + categoryTotals.beer + categoryTotals.wine + categoryTotals.liquor + categoryTotals.nonAlc;
        const txNetSales = transactionRecords.reduce((sum, r) => sum + Number(r.netSales ?? 0), 0);

        // Get all stats
        const exclusionStats = getExclusionStats();
        const voidedOrders = getVoidedOrdersCount();
        const voidRefundStats = getVoidAndRefundStats();
        const orderExclusionStats = getOrderExclusionStats();
        const discountStats = getDiscountStats();
        const refundStats = getRefundStats();
        const revenueComparison = getRevenueMethodComparison();

        // Calculate totals
        const totalOrdersInDB = transactionRecords.reduce((sum, r) => sum + (r.transactionCount ?? 0), 0);
        const totalDiscountsInDB = transactionRecords.reduce((sum, r) => sum + Number(r.discounts ?? 0), 0);
        const totalRefundsInDB = transactionRecords.reduce((sum, r) => sum + Number(r.refunds ?? 0), 0);
        const totalGrossInDB = transactionRecords.reduce((sum, r) => sum + Number(r.grossSales ?? 0), 0);

        // Log sync summary to console
        console.log(`\n[Toast Sync] ================== SYNC SUMMARY ==================`);
        console.log(`[Toast Sync] Date Range: ${exclusionStats.dateRange.first} to ${exclusionStats.dateRange.last} (${totalUniqueDays} days)`);
        console.log(`[Toast Sync]`);

        // ORDER COUNT
        console.log(`[Toast Sync] ORDER COUNT:`);
        console.log(`[Toast Sync]   Raw from API:     ${rawOrders.length}`);
        console.log(`[Toast Sync]   After date filter: ${orders.length}`);
        console.log(`[Toast Sync]   Exclusions:       -${orderExclusionStats.voidedOrders} voided, -${orderExclusionStats.deletedOrders} deleted`);
        console.log(`[Toast Sync]   Processed:        ${orderExclusionStats.processedOrders}`);
        console.log(`[Toast Sync]   In DB:            ${totalOrdersInDB}`);
        console.log(`[Toast Sync]   Toast target:     ~4,058`);
        console.log(`[Toast Sync]`);

        // DISCOUNTS - THIS IS THE KEY DEBUG INFO
        console.log(`[Toast Sync] DISCOUNTS:`);
        console.log(`[Toast Sync]   Item-level:    ${discountStats.itemLevelCount} discounts = $${discountStats.itemLevelAmount.toFixed(2)}`);
        console.log(`[Toast Sync]   Check-level:   ${discountStats.checkLevelCount} discounts = $${discountStats.checkLevelAmount.toFixed(2)}`);
        console.log(`[Toast Sync]   Derived:       $${discountStats.derivedAmount.toFixed(2)} (from gross-net difference)`);
        console.log(`[Toast Sync]   TOTAL:         $${discountStats.totalDiscounts.toFixed(2)}`);
        console.log(`[Toast Sync]   In DB:         $${totalDiscountsInDB.toFixed(2)}`);
        console.log(`[Toast Sync]   Expected:      ~$12,380 to match Toast`);
        console.log(`[Toast Sync]`);

        // REFUNDS
        console.log(`[Toast Sync] REFUNDS:`);
        console.log(`[Toast Sync]   From refund.refundAmount: ${refundStats.fromRefundObject.count} = $${refundStats.fromRefundObject.amount.toFixed(2)}`);
        console.log(`[Toast Sync]   From payment.refundAmount: ${refundStats.fromRefundAmount.count} = $${refundStats.fromRefundAmount.amount.toFixed(2)}`);
        console.log(`[Toast Sync]   TOTAL APPLIED:            $${refundStats.totalApplied.toFixed(2)}`);
        console.log(`[Toast Sync]   In DB:                    $${totalRefundsInDB.toFixed(2)}`);
        console.log(`[Toast Sync]   Expected:                 ~$337.78 (all 6 refunds)`);
        console.log(`[Toast Sync]`);

        // REVENUE CALCULATION
        console.log(`[Toast Sync] REVENUE:`);
        console.log(`[Toast Sync]   Gross (check.amount): $${totalGrossInDB.toFixed(2)}`);
        console.log(`[Toast Sync]   - Service charges:    $${exclusionStats.serviceCharges.toFixed(2)} (${exclusionStats.serviceChargeCount} charges)`);
        console.log(`[Toast Sync]       Gratuity:         $${exclusionStats.gratuityServiceCharges.toFixed(2)}`);
        console.log(`[Toast Sync]       Non-gratuity:     $${exclusionStats.nonGratuityServiceCharges.toFixed(2)}`);
        console.log(`[Toast Sync]   - Discounts:          $${discountStats.totalDiscounts.toFixed(2)}`);
        console.log(`[Toast Sync]   - Refunds:            $${refundStats.totalApplied.toFixed(2)}`);
        console.log(`[Toast Sync]   = Net Sales:          $${txNetSales.toFixed(2)}`);
        console.log(`[Toast Sync]`);

        // CATEGORY BREAKDOWN
        console.log(`[Toast Sync] CATEGORIES:`);
        console.log(`[Toast Sync]   Food:    $${categoryTotals.food.toFixed(2)}`);
        console.log(`[Toast Sync]   Beer:    $${categoryTotals.beer.toFixed(2)}`);
        console.log(`[Toast Sync]   Wine:    $${categoryTotals.wine.toFixed(2)}`);
        console.log(`[Toast Sync]   Liquor:  $${categoryTotals.liquor.toFixed(2)}`);
        console.log(`[Toast Sync]   Non-Alc: $${categoryTotals.nonAlc.toFixed(2)}`);
        console.log(`[Toast Sync]   Uncategorized: $${(categoryTotals.totalRevenue - sumCategories).toFixed(2)}`);
        console.log(`[Toast Sync]   SUM:     $${sumCategories.toFixed(2)}`);
        const categoryGap = sumCategories - txNetSales;
        console.log(`[Toast Sync]   vs Net:  ${categoryGap >= 0 ? '+' : ''}$${categoryGap.toFixed(2)} ${Math.abs(categoryGap) < 1 ? '✓ MATCH' : '← gap'}`);
        console.log(`[Toast Sync]`);

        // EXCLUSIONS
        console.log(`[Toast Sync] EXCLUSIONS:`);
        console.log(`[Toast Sync]   Voided checks: ${voidRefundStats.voidedChecksCount} ($${voidRefundStats.voidedChecksAmount.toFixed(2)})`);
        console.log(`[Toast Sync]   Voided items:  ${exclusionStats.voidedCount} ($${exclusionStats.voidedAmount.toFixed(2)})`);
        console.log(`[Toast Sync] ===========================================================\n`);

        // Phase 5: Complete
        sendProgress({
          phase: "complete",
          message: `Sync complete! Imported ${orders.length} orders across ${totalUniqueDays} days`,
          ordersProcessed: orders.length,
          totalDays: totalUniqueDays,
          currentDay: totalUniqueDays,
          percentComplete: 100,
        });

        controller.close();
      } catch (error) {
        console.error("[Toast Sync Stream] Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

        // Update integration with error
        await prisma.integration.update({
          where: { id: integrationId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: "FAILED",
            lastSyncError: errorMessage,
          },
        });

        sendProgress({
          phase: "error",
          message: "Sync failed",
          ordersProcessed: 0,
          totalDays,
          currentDay: 0,
          percentComplete: 0,
          error: errorMessage,
        });

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
