/**
 * Toast POS Sync Logic
 *
 * Handles synchronization of Toast data to Prometheus warehouse tables.
 */

import prisma from "@/lib/prisma";
import { createToastClient } from "./client";
import { getToastConfig, updateToastConfig } from "./auth";
import {
  aggregateOrdersByDaypart,
  mapDaypartAggregatesToPrisma,
  aggregateOrdersToTransactions,
  mapTransactionAggregatesToPrisma,
  resetDaypartDebugCounter,
  resetCategoryDebugCounter,
  resetExclusionCounters,
  resetVoidedOrdersCounter,
  resetVoidAndRefundCounters,
  getExclusionStats,
  getVoidedOrdersCount,
  getVoidAndRefundStats,
  type ToastConfigMappings,
} from "./mappers/orders";
import {
  aggregateTimeEntriesByPosition,
  mapLaborAggregatesToPrisma,
} from "./mappers/labor";
import {
  mapCategoriesToPrismaCreateMany,
  mapMenuItemsToPrisma,
} from "./mappers/menus";
import {
  createSyncJob,
  updateSyncJobProgress,
  completeSyncJob,
  getMonthlyDateRanges,
} from "../sync-manager";
import type { ToastSyncOptions, ToastSyncResult, ToastDataType } from "./types";

/**
 * Sync Toast data for an integration
 */
export async function syncToastData(
  integrationId: string,
  options: ToastSyncOptions = {}
): Promise<ToastSyncResult> {
  const client = createToastClient(integrationId);
  const config = await getToastConfig(integrationId);

  // DEBUG LINE 42
  console.log('[Toast Sync] Raw config from getToastConfig:', JSON.stringify(config, null, 2));

  if (!config?.restaurantGuid) {
    throw new Error("Toast integration not properly configured");
  }

  // Extract config mappings for GUID → name resolution
  const configMappings: ToastConfigMappings = {
    salesCategories: config.salesCategories,
    restaurantServices: config.restaurantServices,
    revenueCenters: config.revenueCenters,
  };

  // DEBUG LINE 57
  console.log('[Toast Sync] configMappings.restaurantServices:', configMappings.restaurantServices);

  // Default to last 24 hours if no dates specified
  const endDate = options.endDate ?? new Date();
  const startDate =
    options.startDate ?? new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  const dataTypes: ToastDataType[] = options.dataTypes ?? ["orders", "labor", "menus"];

  // Get the integration's location
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { locationId: true },
  });

  if (!integration?.locationId) {
    throw new Error("Integration has no location");
  }

  const primaryLocationId = integration.locationId;

  // Create sync job
  const jobId = createSyncJob({
    integrationId,
    locationId: primaryLocationId,
    startDate,
    endDate,
    dataTypes,
  });

  let ordersProcessed = 0;
  let laborEntriesProcessed = 0;
  let menuItemsProcessed = 0;
  const errors: string[] = [];

  try {
    // Sync orders
    if (dataTypes.includes("orders")) {
      updateSyncJobProgress(jobId, {
        currentStep: "Syncing orders",
        progress: 10,
        status: "running",
      });

      try {
        console.log(`[Toast Sync] Fetching orders from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        const orders = await client.fetchAllOrders({ startDate, endDate });
        ordersProcessed = orders.length;
        console.log(`[Toast Sync] Fetched ${orders.length} orders`);

        // Log sample order structure to identify daypart and category fields
        if (orders.length > 0) {
          const sample = orders[0];
          console.log(`[Toast Sync] ====== SAMPLE ORDER STRUCTURE ======`);
          console.log(`[Toast Sync] Order GUID: ${sample.guid}`);
          console.log(`[Toast Sync] Business Date: ${sample.businessDate}`);
          console.log(`[Toast Sync] Opened Date: ${sample.openedDate}`);
          console.log(`[Toast Sync] Closed Date: ${sample.closedDate}`);

          // Log service/daypart fields
          console.log(`[Toast Sync] --- SERVICE/DAYPART FIELDS ---`);
          console.log(`[Toast Sync] restaurantService: ${JSON.stringify(sample.restaurantService)}`);
          console.log(`[Toast Sync] revenueCenter: ${JSON.stringify(sample.revenueCenter)}`);
          console.log(`[Toast Sync] serviceArea: ${JSON.stringify(sample.serviceArea)}`);
          console.log(`[Toast Sync] shift: ${JSON.stringify(sample.shift)}`);
          console.log(`[Toast Sync] diningOption: ${JSON.stringify(sample.diningOption)}`);

          // Log check totals
          const sampleCheck = sample.checks?.[0];
          if (sampleCheck) {
            console.log(`[Toast Sync] --- SAMPLE CHECK TOTALS ---`);
            console.log(`[Toast Sync] amount (pre-discount): ${sampleCheck.amount}`);
            console.log(`[Toast Sync] totalAmount (final): ${sampleCheck.totalAmount}`);
            console.log(`[Toast Sync] taxAmount: ${sampleCheck.taxAmount}`);
            console.log(`[Toast Sync] netAmount: ${sampleCheck.netAmount}`);
            console.log(`[Toast Sync] appliedDiscounts: ${JSON.stringify(sampleCheck.appliedDiscounts)}`);

            // Log selection with sales category
            if (sampleCheck.selections?.length > 0) {
              console.log(`[Toast Sync] --- SAMPLE SELECTION (1 of ${sampleCheck.selections.length}) ---`);
              const sel = sampleCheck.selections[0];
              console.log(`[Toast Sync] item: ${JSON.stringify(sel.item)}`);
              console.log(`[Toast Sync] salesCategory: ${JSON.stringify(sel.salesCategory)}`);
              console.log(`[Toast Sync] itemGroup: ${JSON.stringify(sel.itemGroup)}`);
              console.log(`[Toast Sync] price: ${sel.price}`);
              console.log(`[Toast Sync] netPrice: ${sel.netPrice}`);
              console.log(`[Toast Sync] quantity: ${sel.quantity}`);
            }
          }

          // Log full first order for complete structure analysis
          console.log(`[Toast Sync] --- FULL ORDER JSON ---`);
          console.log(JSON.stringify(sample, null, 2));
        }

        if (orders.length > 0) {
          // Reset all debug counters
          resetDaypartDebugCounter();
          resetCategoryDebugCounter();
          resetExclusionCounters();
          resetVoidedOrdersCounter();
          resetVoidAndRefundCounters();
          console.log(`[Toast Sync] ========== PROCESSING ${orders.length} ORDERS ==========`);
          const daypartAggregates = aggregateOrdersByDaypart(orders, primaryLocationId, configMappings);
          const daypartRecords = mapDaypartAggregatesToPrisma(
            daypartAggregates,
            primaryLocationId
          );
          console.log(`[Toast Sync] Generated ${daypartRecords.length} daypart records for location ${primaryLocationId}`);

          // Aggregate transaction summaries
          const transactionAggregates = aggregateOrdersToTransactions(orders);
          const transactionRecords = mapTransactionAggregatesToPrisma(
            transactionAggregates,
            primaryLocationId
          );

          // Collect unique dates from daypart records to clean up stale entries
          const uniqueDates = new Set<string>();
          for (const record of daypartRecords) {
            const dateStr = record.date instanceof Date
              ? record.date.toISOString().slice(0, 10)
              : String(record.date).slice(0, 10);
            uniqueDates.add(dateStr);
          }

          // Delete ALL existing daypart records for these dates before inserting fresh data
          console.log(`[Toast Sync] Cleaning up ${uniqueDates.size} dates...`);
          let totalDeleted = 0;
          for (const dateStr of uniqueDates) {
            const dateValue = new Date(dateStr + 'T00:00:00.000Z');
            const deleted = await prisma.daypartMetrics.deleteMany({
              where: {
                locationId: primaryLocationId,
                date: dateValue,
              },
            });
            totalDeleted += deleted.count;
          }
          console.log(`[Toast Sync] Deleted ${totalDeleted} stale daypart records`);

          // Now insert fresh daypart metrics
          console.log(`[Toast Sync] Inserting ${daypartRecords.length} daypart records...`);
          for (const record of daypartRecords) {
            const { locationId, date, daypart, ...createData } = record;
            const dateStr = date instanceof Date ? date.toISOString().slice(0,10) : String(date);
            try {
              await prisma.daypartMetrics.create({
                data: {
                  location: { connect: { id: locationId } },
                  date,
                  daypart,
                  ...createData,
                },
              });
            } catch (createError) {
              console.error(`[Toast Sync] Failed to create daypart metric:`, {
                locationId,
                date: dateStr,
                daypart,
                error: createError instanceof Error ? createError.message : createError,
              });
              throw createError;
            }
          }

          // Save transaction summaries
          console.log(`[Toast Sync] Upserting ${transactionRecords.length} transaction records...`);
          let transactionUpsertCount = 0;
          for (const record of transactionRecords) {
            const { locationId, date, ...updateData } = record;
            const dateStr = date instanceof Date ? date.toISOString().slice(0,10) : String(date);
            try {
              await prisma.transactionSummary.upsert({
                where: {
                  locationId_date: {
                    locationId,
                    date,
                  },
                },
                update: updateData,
                create: {
                  location: { connect: { id: locationId } },
                  date,
                  ...updateData,
                },
              });
              transactionUpsertCount++;
            } catch (upsertError) {
              console.error(`[Toast Sync] Failed to upsert transaction:`, {
                locationId,
                date: dateStr,
                error: upsertError instanceof Error ? upsertError.message : upsertError,
              });
              throw upsertError;
            }
          }

          // ========== FINAL SYNC SUMMARY ==========
          // Calculate category totals from daypart records
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

          // Get exclusion stats
          const exclusionStats = getExclusionStats();
          const voidedOrders = getVoidedOrdersCount();
          const voidRefundStats = getVoidAndRefundStats();

          console.log(`\n[Toast Sync] ================== SYNC SUMMARY ==================`);
          console.log(`[Toast Sync] Orders: ${orders.length} fetched → ${orders.length - voidedOrders - voidRefundStats.voidedChecksCount} processed`);
          console.log(`[Toast Sync] Records: ${transactionUpsertCount} TransactionSummary, ${daypartRecords.length} DaypartMetrics`);
          console.log(`[Toast Sync] Dates: ${uniqueDates.size} unique (${(daypartRecords.length / uniqueDates.size).toFixed(1)} dayparts/day avg)`);
          console.log(`[Toast Sync]`);
          console.log(`[Toast Sync] REVENUE:`);
          console.log(`[Toast Sync]   Net Sales:  $${txNetSales.toFixed(2)}`);
          console.log(`[Toast Sync]   By Category:`);
          console.log(`[Toast Sync]     Food:     $${categoryTotals.food.toFixed(2)}`);
          console.log(`[Toast Sync]     Beer:     $${categoryTotals.beer.toFixed(2)}`);
          console.log(`[Toast Sync]     Wine:     $${categoryTotals.wine.toFixed(2)}`);
          console.log(`[Toast Sync]     Liquor:   $${categoryTotals.liquor.toFixed(2)}`);
          console.log(`[Toast Sync]     Non-Alc:  $${categoryTotals.nonAlc.toFixed(2)}`);
          console.log(`[Toast Sync]     Sum:      $${sumCategories.toFixed(2)}`);
          console.log(`[Toast Sync]     Gap:      $${(categoryTotals.totalRevenue - sumCategories).toFixed(2)} (uncategorized)`);
          console.log(`[Toast Sync]`);
          console.log(`[Toast Sync] EXCLUSIONS APPLIED:`);
          console.log(`[Toast Sync]   Voided orders:     ${voidedOrders}`);
          console.log(`[Toast Sync]   Voided checks:     ${voidRefundStats.voidedChecksCount} ($${voidRefundStats.voidedChecksAmount.toFixed(2)})`);
          console.log(`[Toast Sync]   Voided items:      ${exclusionStats.voidedCount} ($${exclusionStats.voidedAmount.toFixed(2)})`);
          console.log(`[Toast Sync]   Refunds:           ${voidRefundStats.refundsCount} ($${voidRefundStats.refundsAmount.toFixed(2)})`);
          console.log(`[Toast Sync]   Gift cards:        ${exclusionStats.giftCardCount} ($${exclusionStats.giftCardAmount.toFixed(2)})`);
          console.log(`[Toast Sync] ===========================================================\n`);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Orders sync failed";
        errors.push(errMsg);
        console.error("Toast orders sync error:", error);
      }
    }

    // Sync labor
    if (dataTypes.includes("labor")) {
      updateSyncJobProgress(jobId, {
        currentStep: "Syncing labor data",
        progress: 40,
        status: "running",
      });

      try {
        const timeEntries = await client.fetchAllTimeEntries({
          modifiedStartDate: startDate,
          modifiedEndDate: endDate,
        });
        laborEntriesProcessed = timeEntries.length;

        if (timeEntries.length > 0) {
          // Aggregate and save labor details
          const laborAggregates = aggregateTimeEntriesByPosition(timeEntries);
          const laborRecords = mapLaborAggregatesToPrisma(
            laborAggregates,
            primaryLocationId
          );

          for (const record of laborRecords) {
            const { locationId, date, positionName, ...updateData } = record;
            await prisma.laborDetail.upsert({
              where: {
                locationId_date_positionName: {
                  locationId,
                  date,
                  positionName,
                },
              },
              update: updateData,
              create: {
                location: { connect: { id: locationId } },
                date,
                positionName,
                ...updateData,
              },
            });
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Labor sync failed";
        errors.push(errMsg);
        console.error("Toast labor sync error:", error);
      }
    }

    // Sync menus
    if (dataTypes.includes("menus")) {
      updateSyncJobProgress(jobId, {
        currentStep: "Syncing menus",
        progress: 70,
        status: "running",
      });

      try {
        const menus = await client.fetchMenus();

        if (menus.length > 0) {
          // Create categories first
          const categoryInputs = mapCategoriesToPrismaCreateMany(menus, primaryLocationId);

          // Upsert categories by name and build ID map
          const categoryIdMap = new Map<string, string>();
          for (const categoryInput of categoryInputs) {
            // Find existing category by name
            const existing = await prisma.menuCategory.findFirst({
              where: {
                locationId: primaryLocationId,
                name: categoryInput.name,
              },
            });

            let category;
            if (existing) {
              category = await prisma.menuCategory.update({
                where: { id: existing.id },
                data: {
                  displayOrder: categoryInput.displayOrder,
                },
              });
            } else {
              category = await prisma.menuCategory.create({
                data: categoryInput,
              });
            }
            categoryIdMap.set(category.name, category.id);
          }

          // Create menu items
          const itemInputs = mapMenuItemsToPrisma(menus, primaryLocationId, categoryIdMap);
          menuItemsProcessed = itemInputs.length;

          for (const itemInput of itemInputs) {
            // Find existing item by name
            const existing = await prisma.menuItem.findFirst({
              where: {
                locationId: itemInput.locationId,
                name: itemInput.name,
              },
            });

            if (existing) {
              await prisma.menuItem.update({
                where: { id: existing.id },
                data: {
                  categoryId: itemInput.categoryId,
                  currentPrice: itemInput.currentPrice,
                  description: itemInput.description,
                  externalId: itemInput.externalId,
                  isActive: itemInput.isActive,
                },
              });
            } else {
              await prisma.menuItem.create({
                data: itemInput,
              });
            }
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Menus sync failed";
        errors.push(errMsg);
        console.error("Toast menus sync error:", error);
      }
    }

    // Update sync status
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: errors.length > 0 ? "PARTIAL" : "SUCCESS",
        lastSyncError: errors.length > 0 ? errors.join("; ") : null,
      },
    });

    completeSyncJob(jobId, errors.length > 0 ? "failed" : "completed");

    return {
      jobId,
      ordersProcessed,
      laborEntriesProcessed,
      menuItemsProcessed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    completeSyncJob(jobId, "failed");

    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "FAILED",
        lastSyncError: error instanceof Error ? error.message : "Sync failed",
      },
    });

    throw error;
  }
}

/**
 * Trigger incremental sync (last 24 hours)
 */
export async function triggerIncrementalSync(
  integrationId: string
): Promise<ToastSyncResult> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  return syncToastData(integrationId, { startDate, endDate });
}

/**
 * Trigger historical sync (last 12 months, 1 month at a time)
 */
export async function triggerHistoricalSync(
  integrationId: string
): Promise<ToastSyncResult> {
  // Get monthly batches for last 12 months
  const batches = getMonthlyDateRanges(12);

  // Get the integration's location
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { locationId: true },
  });

  if (!integration?.locationId) {
    throw new Error("Integration has no location");
  }

  const jobId = createSyncJob({
    integrationId,
    locationId: integration.locationId,
    startDate: batches[0]?.start ?? new Date(),
    endDate: batches[batches.length - 1]?.end ?? new Date(),
    fullSync: true,
  });

  let totalOrdersProcessed = 0;
  let totalLaborProcessed = 0;
  let totalMenuItemsProcessed = 0;
  const errors: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    updateSyncJobProgress(jobId, {
      currentStep: `Syncing ${batch.start.toISOString().slice(0, 7)}`,
      progress: Math.round((i / batches.length) * 90),
      status: "running",
    });

    try {
      const result = await syncToastData(integrationId, {
        startDate: batch.start,
        endDate: batch.end,
        dataTypes: ["orders", "labor"], // Only sync menus once
      });

      totalOrdersProcessed += result.ordersProcessed ?? 0;
      totalLaborProcessed += result.laborEntriesProcessed ?? 0;

      if (result.errors) {
        errors.push(...result.errors);
      }
    } catch (error) {
      errors.push(
        `Batch ${i + 1} failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Small delay between batches to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Sync menus once at the end
  try {
    const menuResult = await syncToastData(integrationId, {
      dataTypes: ["menus"],
    });
    totalMenuItemsProcessed = menuResult.menuItemsProcessed ?? 0;
  } catch (error) {
    errors.push(`Menu sync failed: ${error instanceof Error ? error.message : "Unknown"}`);
  }

  // Update config with last full sync
  await updateToastConfig(integrationId, {
    lastFullSync: new Date().toISOString(),
  });

  completeSyncJob(jobId, errors.length > 0 ? "failed" : "completed");

  return {
    jobId,
    ordersProcessed: totalOrdersProcessed,
    laborEntriesProcessed: totalLaborProcessed,
    menuItemsProcessed: totalMenuItemsProcessed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Get Toast sync status
 */
export async function getToastSyncStatus(integrationId: string): Promise<{
  isConfigured: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  mappedLocations: number;
}> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration) {
    return {
      isConfigured: false,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      mappedLocations: 0,
    };
  }

  const config = await getToastConfig(integrationId);
  const mappedLocations = Object.keys(config?.locationMappings ?? {}).length;

  return {
    isConfigured: !!config?.restaurantGuid,
    lastSyncAt: integration.lastSyncAt,
    lastSyncStatus: integration.lastSyncStatus,
    lastSyncError: integration.lastSyncError,
    mappedLocations,
  };
}
