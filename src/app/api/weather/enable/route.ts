import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { fetchHistoricalWeather } from "@/lib/weather/open-meteo";

const requestSchema = z.object({
  locationId: z.string(),
});

/**
 * POST /api/weather/enable
 *
 * Enables weather intelligence for a location:
 * 1. Sets weatherEnabled = true
 * 2. Backfills historical weather for all dates with sales data
 * 3. Returns success so the client can then generate weather insights
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { locationId } = requestSchema.parse(body);

    // Verify location belongs to user's organization
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { restaurantGroup: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check for coordinates
    if (!location.latitude || !location.longitude) {
      return NextResponse.json(
        { error: "Location missing coordinates. Please set latitude and longitude first." },
        { status: 400 }
      );
    }

    // Get date range from transaction data
    const dateRange = await prisma.transactionSummary.aggregate({
      where: { locationId },
      _min: { date: true },
      _max: { date: true },
    });

    if (!dateRange._min.date || !dateRange._max.date) {
      return NextResponse.json(
        { error: "No sales data found. Please sync sales data first." },
        { status: 400 }
      );
    }

    const startDate = dateRange._min.date.toISOString().slice(0, 10);
    const endDate = dateRange._max.date.toISOString().slice(0, 10);

    console.log(`[Weather Enable] Backfilling weather for ${location.name}: ${startDate} to ${endDate}`);

    // Fetch historical weather
    const weatherData = await fetchHistoricalWeather(
      location.latitude,
      location.longitude,
      startDate,
      endDate,
      location.timezone || "America/Chicago"
    );

    console.log(`[Weather Enable] Fetched ${weatherData.length} days of weather data`);

    // Store weather data
    let inserted = 0;
    let updated = 0;

    for (const day of weatherData) {
      const weatherDate = new Date(day.date);

      const existing = await prisma.weatherData.findUnique({
        where: {
          locationId_date: {
            locationId,
            date: weatherDate,
          },
        },
      });

      const weatherRecord = {
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
      };

      if (existing) {
        await prisma.weatherData.update({
          where: { id: existing.id },
          data: weatherRecord,
        });
        updated++;
      } else {
        await prisma.weatherData.create({
          data: {
            locationId,
            date: weatherDate,
            ...weatherRecord,
          },
        });
        inserted++;
      }
    }

    console.log(`[Weather Enable] Stored weather: ${inserted} inserted, ${updated} updated`);

    // Mark location as weather enabled
    await prisma.location.update({
      where: { id: locationId },
      data: {
        weatherEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Weather intelligence enabled",
      weatherDays: weatherData.length,
      dateRange: { start: startDate, end: endDate },
      inserted,
      updated,
    });
  } catch (error) {
    console.error("[Weather Enable] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to enable weather", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/weather/enable?locationId=xxx
 *
 * Check if weather is enabled for a location
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json(
      { error: "locationId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        name: true,
        weatherEnabled: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Get weather data count if enabled
    let weatherDays = 0;
    let dateRange: { start: string; end: string } | null = null;

    if (location.weatherEnabled) {
      weatherDays = await prisma.weatherData.count({
        where: { locationId },
      });

      const range = await prisma.weatherData.aggregate({
        where: { locationId },
        _min: { date: true },
        _max: { date: true },
      });

      if (range._min.date && range._max.date) {
        dateRange = {
          start: range._min.date.toISOString().slice(0, 10),
          end: range._max.date.toISOString().slice(0, 10),
        };
      }
    }

    return NextResponse.json({
      enabled: location.weatherEnabled,
      hasCoordinates: !!(location.latitude && location.longitude),
      weatherDays,
      dateRange,
    });
  } catch (error) {
    console.error("[Weather Enable Check] Error:", error);
    return NextResponse.json(
      { error: "Failed to check weather status" },
      { status: 500 }
    );
  }
}
