import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createToastClient } from "@/lib/integrations/toast/client";
import { getToastConfig } from "@/lib/integrations/toast/auth";
import { updateDataFacts } from "@/lib/ai/claude";
import { fetchHistoricalWeather } from "@/lib/weather/open-meteo";
import { fetchSanAntonioEvents } from "@/lib/events/seatgeek";
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
  weatherSynced?: boolean;
  eventsSynced?: number; // Number of SeatGeek events cached
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
            weatherEnabled: true,
            eventsEnabled: true,
            latitude: true,
            longitude: true,
            timezone: true,
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
        now,
        {
          weatherEnabled: integration.location.weatherEnabled,
          eventsEnabled: integration.location.eventsEnabled,
          latitude: integration.location.latitude,
          longitude: integration.location.longitude,
          timezone: integration.location.timezone,
        }
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

interface LocationInfo {
  weatherEnabled: boolean;
  eventsEnabled: boolean;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

/**
 * Sync a single location's Toast data for the given date range
 */
async function syncLocation(
  integrationId: string,
  locationId: string,
  locationName: string,
  startDate: Date,
  endDate: Date,
  locationInfo: LocationInfo
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

    // Sync weather data if weather is enabled
    let weatherSynced = false;
    if (locationInfo.weatherEnabled && locationInfo.latitude && locationInfo.longitude) {
      try {
        console.log(`[Cron Sync] ${locationName}: Syncing weather data...`);

        // Get yesterday's date as string
        const yesterdayStr = startDate.toISOString().slice(0, 10);
        const todayStr = new Date(endDate).toISOString().slice(0, 10);

        // Fetch weather for yesterday and today
        const weatherData = await fetchHistoricalWeather(
          locationInfo.latitude,
          locationInfo.longitude,
          yesterdayStr,
          todayStr,
          locationInfo.timezone || "America/Chicago"
        );

        // Store weather data
        for (const day of weatherData) {
          const weatherDate = new Date(day.date);

          await prisma.weatherData.upsert({
            where: {
              locationId_date: {
                locationId,
                date: weatherDate,
              },
            },
            update: {
              tempHigh: day.tempHigh,
              tempLow: day.tempLow,
              tempAvg: day.tempMean,
              precipitation: day.precipitationInches,
              precipitationHours: day.precipitationHours,
              rainInches: day.rainInches,
              snowfall: day.snowfallInches,
              weatherCode: day.weatherCode,
              weatherDescription: day.weatherDescription,
              windSpeedMax: day.windSpeedMaxMph,
              isRainy: day.isRainy,
              isExtremeHeat: day.isExtremeHeat,
              isExtremeCold: day.isExtremeCold,
              isSevereWeather: day.isSevereWeather,
              isActual: true,
            },
            create: {
              locationId,
              date: weatherDate,
              tempHigh: day.tempHigh,
              tempLow: day.tempLow,
              tempAvg: day.tempMean,
              precipitation: day.precipitationInches,
              precipitationHours: day.precipitationHours,
              rainInches: day.rainInches,
              snowfall: day.snowfallInches,
              weatherCode: day.weatherCode,
              weatherDescription: day.weatherDescription,
              windSpeedMax: day.windSpeedMaxMph,
              isRainy: day.isRainy,
              isExtremeHeat: day.isExtremeHeat,
              isExtremeCold: day.isExtremeCold,
              isSevereWeather: day.isSevereWeather,
              isActual: true,
            },
          });
        }

        weatherSynced = true;
        console.log(`[Cron Sync] ${locationName}: Weather synced (${weatherData.length} days)`);
      } catch (weatherError) {
        console.error(`[Cron Sync] ${locationName}: Failed to sync weather:`, weatherError);
        // Non-critical, continue
      }
    }

    // Sync SeatGeek events if API key is configured and location has coordinates
    let eventsSynced = 0;
    const seatgeekClientId = process.env.SEATGEEK_CLIENT_ID;
    if (seatgeekClientId && locationInfo.latitude && locationInfo.longitude) {
      try {
        console.log(`[Cron Sync] ${locationName}: Syncing SeatGeek events...`);

        // Fetch next 30 days of events
        const today = new Date();
        const thirtyDaysOut = new Date(today);
        thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

        const todayStr = today.toISOString().split("T")[0];
        const thirtyDaysOutStr = thirtyDaysOut.toISOString().split("T")[0];

        const events = await fetchSanAntonioEvents(
          todayStr,
          thirtyDaysOutStr,
          locationInfo.latitude,
          locationInfo.longitude
        );

        // Cache events in local_events table
        for (const event of events) {
          await prisma.localEvent.upsert({
            where: {
              locationId_source_externalId: {
                locationId,
                source: "SEATGEEK",
                externalId: event.externalId,
              },
            },
            create: {
              locationId,
              name: event.name,
              date: new Date(event.date),
              startTime: event.startTime ? new Date(`${event.date}T${event.startTime}:00`) : null,
              venueName: event.venue,
              venueAddress: event.venueAddress || null,
              venueLat: event.venueLat,
              venueLng: event.venueLon,
              distanceMiles: event.distanceMiles,
              category: event.category as "SPORTS" | "CONCERT" | "THEATER" | "COMEDY" | "CONVENTION" | "CONFERENCE" | "FESTIVAL" | "HOLIDAY" | "SCHOOL_BREAK" | "COMMUNITY" | "OTHER",
              subcategory: event.subcategory || null,
              expectedAttendance: event.estimatedAttendance || null,
              popularityScore: event.popularity,
              impactLevel: event.impactLevel === "high" ? "HIGH" : event.impactLevel === "medium" ? "MODERATE" : "LOW",
              impactNote: event.impactNote,
              source: "SEATGEEK",
              externalId: event.externalId,
              externalUrl: event.externalUrl,
              rawData: event.rawData as object,
            },
            update: {
              name: event.name,
              startTime: event.startTime ? new Date(`${event.date}T${event.startTime}:00`) : null,
              venueName: event.venue,
              venueAddress: event.venueAddress || null,
              distanceMiles: event.distanceMiles,
              expectedAttendance: event.estimatedAttendance || null,
              popularityScore: event.popularity,
              impactLevel: event.impactLevel === "high" ? "HIGH" : event.impactLevel === "medium" ? "MODERATE" : "LOW",
              impactNote: event.impactNote,
              externalUrl: event.externalUrl,
              rawData: event.rawData as object,
              updatedAt: new Date(),
            },
          });
        }

        eventsSynced = events.length;

        // Enable events for this location if we synced any
        if (events.length > 0 && !locationInfo.eventsEnabled) {
          await prisma.location.update({
            where: { id: locationId },
            data: { eventsEnabled: true },
          });
        }

        console.log(`[Cron Sync] ${locationName}: SeatGeek synced (${events.length} events for next 30 days)`);
      } catch (eventsError) {
        console.error(`[Cron Sync] ${locationName}: Failed to sync SeatGeek events:`, eventsError);
        // Non-critical, continue
      }
    }

    // Check for stale insights and auto-refresh
    try {
      await refreshStaleInsights(locationId, locationName, locationInfo.weatherEnabled);
    } catch (insightError) {
      console.error(`[Cron Sync] ${locationName}: Failed to refresh insights:`, insightError);
      // Non-critical, continue
    }

    console.log(`[Cron Sync] ${locationName}: Sync complete. Yesterday: ${yesterdayOrders} orders, Today: ${todayOrders} orders`);

    return {
      locationId,
      locationName,
      success: true,
      yesterdayOrders,
      todayOrders,
      weatherSynced,
      eventsSynced,
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

/**
 * Check for stale insights and auto-refresh if all insights in a layer are expired
 */
async function refreshStaleInsights(
  locationId: string,
  locationName: string,
  weatherEnabled: boolean
): Promise<void> {
  const now = new Date();
  const layers = weatherEnabled ? ["sales", "weather"] : ["sales"];

  for (const layer of layers) {
    // Get active insights for this layer
    const activeInsights = await prisma.aIInsight.findMany({
      where: {
        locationId,
        layer,
        status: { in: ["active", "pinned"] },
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    // Check if all are stale (expired and not pinned)
    const allStale = activeInsights.length > 0 && activeInsights.every(
      (i) => i.status === "active" && i.expiresAt && new Date(i.expiresAt) < now
    );

    const noInsights = activeInsights.length === 0;

    if (allStale || noInsights) {
      console.log(`[Cron Sync] ${locationName}: Auto-refreshing ${layer} insights (${allStale ? "all stale" : "none exist"})`);

      // Archive old active insights
      await prisma.aIInsight.updateMany({
        where: {
          locationId,
          layer,
          status: "active",
        },
        data: {
          status: "archived",
          isCurrent: false,
        },
      });

      // Trigger insight generation via internal fetch
      // Note: In production, you might want to use a proper queue system
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";

        const response = await fetch(`${baseUrl}/api/intelligence/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Use internal API secret for cron-triggered generation
            "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
          },
          body: JSON.stringify({
            locationId,
            dataType: "combined",
            layer,
            forceNew: true,
          }),
        });

        if (response.ok) {
          console.log(`[Cron Sync] ${locationName}: Successfully auto-refreshed ${layer} insights`);
        } else {
          const error = await response.text();
          console.error(`[Cron Sync] ${locationName}: Failed to auto-refresh ${layer} insights:`, error);
        }
      } catch (fetchError) {
        console.error(`[Cron Sync] ${locationName}: Error calling insight generation:`, fetchError);
      }
    }
  }
}
