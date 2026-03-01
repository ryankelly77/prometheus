import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createToastClient } from "@/lib/integrations/toast/client";
import { getToastConfig } from "@/lib/integrations/toast/auth";
import { updateDataFacts } from "@/lib/ai/claude";
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
} from "@/lib/integrations/toast/mappers/orders";

// Allow up to 5 minutes for cron job
export const maxDuration = 300;

interface SyncResult {
  locationId: string;
  locationName: string;
  success: boolean;
  yesterdayOrders?: number;
  todayOrders?: number;
  error?: string;
}

/**
 * GET /api/cron/sync-daily
 *
 * Nightly cron job to sync yesterday's and today's sales data from Toast
 * for all connected restaurants.
 *
 * Triggered by Vercel Cron at 4:00 AM Central daily.
 *
 * Authorization: Bearer token matching CRON_SECRET env var
 */
export async function GET(request: NextRequest) {
  console.log("[Cron Sync] Starting daily sync job...");

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    console.error("[Cron Sync] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    console.error("[Cron Sync] Invalid or missing authorization");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Get all locations with active Toast integrations
    const integrations = await prisma.integration.findMany({
      where: {
        type: "TOAST",
        status: "CONNECTED",
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    // Filter to only active locations
    const activeIntegrations = integrations.filter(
      (i) => i.location.isActive
    );

    console.log(`[Cron Sync] Found ${activeIntegrations.length} active Toast integrations`);

    if (activeIntegrations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active Toast integrations found",
        results: [],
      });
    }

    // Calculate date ranges
    // Yesterday: full day
    // Today: partial (up to current time)
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    console.log(`[Cron Sync] Syncing data for ${yesterday.toISOString().slice(0, 10)} (yesterday) and ${today.toISOString().slice(0, 10)} (today)`);

    // Process each integration
    const results: SyncResult[] = [];

    for (const integration of activeIntegrations) {
      const result = await syncLocation(
        integration.id,
        integration.location.id,
        integration.location.name,
        yesterday,
        now
      );
      results.push(result);
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[Cron Sync] Completed. Success: ${successful}, Failed: ${failed}`);

    return NextResponse.json({
      success: failed === 0,
      message: `Synced ${successful} locations, ${failed} failures`,
      results,
    });
  } catch (error) {
    console.error("[Cron Sync] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Sync a single location's Toast data for the given date range
 */
async function syncLocation(
  integrationId: string,
  locationId: string,
  locationName: string,
  startDate: Date,
  endDate: Date
): Promise<SyncResult> {
  console.log(`[Cron Sync] Starting sync for ${locationName}...`);

  try {
    // Get Toast client and config
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

    // Fetch orders from Toast
    const rawOrders = await client.fetchAllOrders({
      startDate,
      endDate,
    });

    console.log(`[Cron Sync] ${locationName}: Fetched ${rawOrders.length} orders`);

    // Filter to date range (Toast sometimes returns outside range)
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const orders = rawOrders.filter((order) => {
      const orderDate = parseBusinessDate(order.businessDate);
      return orderDate >= startDateOnly && orderDate <= endDateOnly;
    });

    console.log(`[Cron Sync] ${locationName}: ${orders.length} orders after filtering`);

    // Count orders by day
    const yesterday = new Date(startDateOnly);
    const today = new Date(startDateOnly);
    today.setDate(today.getDate() + 1);

    let yesterdayOrders = 0;
    let todayOrders = 0;

    for (const order of orders) {
      const orderDate = parseBusinessDate(order.businessDate);
      if (orderDate.getTime() === yesterday.getTime()) {
        yesterdayOrders++;
      } else if (orderDate.getTime() === today.getTime()) {
        todayOrders++;
      }
    }

    if (orders.length === 0) {
      console.log(`[Cron Sync] ${locationName}: No orders to process`);

      // Still update the integration timestamp
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "SUCCESS",
          lastSyncError: null,
        },
      });

      return {
        locationId,
        locationName,
        success: true,
        yesterdayOrders: 0,
        todayOrders: 0,
      };
    }

    // Reset debug counters
    resetDaypartDebugCounter();
    resetCategoryDebugCounter();
    resetExclusionCounters();
    resetVoidedOrdersCounter();
    resetVoidAndRefundCounters();

    // Process orders
    const daypartAggregates = aggregateOrdersByDaypart(orders, locationId, configMappings);
    const daypartRecords = mapDaypartAggregatesToPrisma(daypartAggregates, locationId);

    const transactionAggregates = aggregateOrdersToTransactions(orders, configMappings);
    const transactionRecords = mapTransactionAggregatesToPrisma(transactionAggregates, locationId);

    // Get unique dates to clean up
    const uniqueDates = new Set<string>();
    for (const record of daypartRecords) {
      const dateStr = record.date instanceof Date
        ? record.date.toISOString().slice(0, 10)
        : String(record.date).slice(0, 10);
      uniqueDates.add(dateStr);
    }

    // Delete existing records for these dates
    for (const dateStr of uniqueDates) {
      const dateValue = new Date(dateStr + "T00:00:00.000Z");
      await prisma.daypartMetrics.deleteMany({
        where: {
          locationId,
          date: dateValue,
        },
      });
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
          locationId_date: {
            locationId: locId,
            date,
          },
        },
        update: {
          ...updateData,
          syncedAt: syncTimestamp,
        },
        create: {
          location: { connect: { id: locId } },
          date,
          ...updateData,
          syncedAt: syncTimestamp,
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

    // Update restaurant profile data facts
    try {
      console.log(`[Cron Sync] ${locationName}: Updating data facts...`);
      await updateDataFacts(locationId);
    } catch (factError) {
      console.error(`[Cron Sync] ${locationName}: Failed to update data facts:`, factError);
      // Non-critical, continue
    }

    // Clear cached daily briefing for today
    try {
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      const deleted = await prisma.dailyBriefing.deleteMany({
        where: {
          locationId,
          briefingDate: todayMidnight,
        },
      });

      if (deleted.count > 0) {
        console.log(`[Cron Sync] ${locationName}: Cleared cached daily briefing`);
      }
    } catch (briefingError) {
      console.error(`[Cron Sync] ${locationName}: Failed to clear daily briefing:`, briefingError);
      // Non-critical, continue
    }

    console.log(`[Cron Sync] ${locationName}: Sync complete. Yesterday: ${yesterdayOrders} orders, Today: ${todayOrders} orders`);

    return {
      locationId,
      locationName,
      success: true,
      yesterdayOrders,
      todayOrders,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Cron Sync] ${locationName}: Error:`, errorMessage);

    // Update integration with error
    try {
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "FAILED",
          lastSyncError: errorMessage,
        },
      });
    } catch {
      // Ignore update errors
    }

    return {
      locationId,
      locationName,
      success: false,
      error: errorMessage,
    };
  }
}
