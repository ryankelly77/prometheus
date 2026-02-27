/**
 * Shared month sync logic for Toast integration
 * Used by both single-month re-sync and 12-month backfill
 */

import prisma from "@/lib/prisma";
import { ToastClient } from "./client";
import { getToastConfig } from "./auth";
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
  type ToastConfigMappings,
} from "./mappers/orders";

export interface SyncMonthCallbacks {
  onFetchingStart?: () => void;
  onPageFetched?: (page: number, ordersLoaded: number) => void;
  onProcessingStart?: (orderCount: number) => void;
  onSavingStart?: () => void;
  onDayProcessed?: (day: number, totalDays: number) => void;
}

export interface SyncMonthResult {
  success: boolean;
  netSales: number;
  orderCount: number;
  daysProcessed: number;
  error?: string;
}

/**
 * Sync a single month of Toast data
 * Reuses existing Toast client (with cached auth token)
 */
export async function syncMonth(
  client: ToastClient,
  integrationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date,
  configMappings: ToastConfigMappings,
  callbacks?: SyncMonthCallbacks
): Promise<SyncMonthResult> {
  try {
    // Phase 1: Fetch orders
    callbacks?.onFetchingStart?.();

    const rawOrders = await client.fetchAllOrders({
      startDate,
      endDate,
      onProgress: ({ page, ordersLoaded }) => {
        callbacks?.onPageFetched?.(page, ordersLoaded);
      },
    });

    // Filter orders to only include those within the requested date range
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const orders = rawOrders.filter(order => {
      const orderDate = parseBusinessDate(order.businessDate);
      return orderDate >= startDateOnly && orderDate <= endDateOnly;
    });

    if (orders.length === 0) {
      return {
        success: true,
        netSales: 0,
        orderCount: 0,
        daysProcessed: 0,
      };
    }

    // Phase 2: Process orders
    callbacks?.onProcessingStart?.(orders.length);

    // Reset debug counters
    resetDaypartDebugCounter();
    resetCategoryDebugCounter();
    resetExclusionCounters();
    resetVoidedOrdersCounter();
    resetVoidAndRefundCounters();

    const daypartAggregates = aggregateOrdersByDaypart(orders, locationId, configMappings);
    const daypartRecords = mapDaypartAggregatesToPrisma(daypartAggregates, locationId);

    const transactionAggregates = aggregateOrdersToTransactions(orders, configMappings);
    const transactionRecords = mapTransactionAggregatesToPrisma(transactionAggregates, locationId);

    // Phase 3: Save to database
    callbacks?.onSavingStart?.();

    // Collect unique dates
    const uniqueDates = new Set<string>();
    for (const record of daypartRecords) {
      const dateStr = record.date instanceof Date
        ? record.date.toISOString().slice(0, 10)
        : String(record.date).slice(0, 10);
      uniqueDates.add(dateStr);
    }

    const totalUniqueDays = uniqueDates.size;
    let daysProcessed = 0;

    // Delete stale records and insert fresh ones
    for (const dateStr of uniqueDates) {
      const dateValue = new Date(dateStr + "T00:00:00.000Z");
      await prisma.daypartMetrics.deleteMany({
        where: { locationId, date: dateValue },
      });
      daysProcessed++;
      callbacks?.onDayProcessed?.(daysProcessed, totalUniqueDays);
    }

    // Insert daypart records
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
    }

    // Upsert transaction summaries
    const syncTimestamp = new Date();
    for (const record of transactionRecords) {
      const { locationId: locId, date, ...updateData } = record;
      await prisma.transactionSummary.upsert({
        where: {
          locationId_date: { locationId: locId, date },
        },
        update: { ...updateData, syncedAt: syncTimestamp },
        create: {
          location: { connect: { id: locId } },
          date,
          ...updateData,
          syncedAt: syncTimestamp,
        },
      });
    }

    // Calculate totals
    const totalNetSales = transactionRecords.reduce((sum, r) => sum + Number(r.netSales ?? 0), 0);
    const totalOrderCount = transactionRecords.reduce((sum, r) => sum + (r.transactionCount ?? 0), 0);

    return {
      success: true,
      netSales: totalNetSales,
      orderCount: totalOrderCount,
      daysProcessed: totalUniqueDays,
    };
  } catch (error) {
    return {
      success: false,
      netSales: 0,
      orderCount: 0,
      daysProcessed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a ToastClient and get config mappings for an integration
 * Reuses auth token across multiple syncMonth calls
 */
export async function createSyncContext(integrationId: string) {
  const client = new ToastClient(integrationId);
  const config = await getToastConfig(integrationId);

  if (!config?.restaurantGuid) {
    throw new Error("Toast integration not properly configured");
  }

  const configMappings: ToastConfigMappings = {
    salesCategories: config.salesCategories,
    restaurantServices: config.restaurantServices,
    revenueCenters: config.revenueCenters,
  };

  return { client, config, configMappings };
}
