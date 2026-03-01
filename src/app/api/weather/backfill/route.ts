import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import {
  fetchHistoricalWeather,
  mapWeatherCodeToCondition,
} from "@/lib/weather/open-meteo";
import type { WeatherCondition } from "@/generated/prisma";

/**
 * POST /api/weather/backfill
 *
 * Backfills historical weather data for all dates that have sales data.
 * Uses Open-Meteo Archive API (free, no API key needed).
 *
 * Request body:
 *   - locationId (optional): Specific location to backfill. If not provided,
 *     uses the first location from the user's organization.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    // Parse request body
    let locationId: string | undefined;
    try {
      const body = await request.json();
      locationId = body.locationId;
    } catch {
      // No body provided, will use default location
    }

    // Get location (either specified or first from org)
    let location;
    if (locationId) {
      location = await prisma.location.findFirst({
        where: {
          id: locationId,
          restaurantGroup: {
            organizationId: auth.membership.organizationId,
          },
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          timezone: true,
        },
      });
    } else {
      location = await prisma.location.findFirst({
        where: {
          restaurantGroup: {
            organizationId: auth.membership.organizationId,
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          timezone: true,
        },
      });
    }

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    if (!location.latitude || !location.longitude) {
      return NextResponse.json(
        {
          error: "Location missing coordinates",
          message: "Please set latitude and longitude for this location first",
        },
        { status: 400 }
      );
    }

    console.log(`[Weather Backfill] Starting for ${location.name}`);

    // Get the date range from transaction data
    const dateRange = await prisma.transactionSummary.aggregate({
      where: { locationId: location.id },
      _min: { date: true },
      _max: { date: true },
    });

    if (!dateRange._min.date || !dateRange._max.date) {
      return NextResponse.json(
        {
          error: "No sales data found",
          message: "Sync sales data first before backfilling weather",
        },
        { status: 400 }
      );
    }

    const startDate = dateRange._min.date.toISOString().slice(0, 10);
    const endDate = dateRange._max.date.toISOString().slice(0, 10);

    console.log(`[Weather Backfill] Date range: ${startDate} to ${endDate}`);

    // Check what dates already have weather data
    const existingWeather = await prisma.weatherData.findMany({
      where: {
        locationId: location.id,
        date: {
          gte: dateRange._min.date,
          lte: dateRange._max.date,
        },
      },
      select: { date: true },
    });

    const existingDates = new Set(
      existingWeather.map((w) => w.date.toISOString().slice(0, 10))
    );

    console.log(`[Weather Backfill] ${existingDates.size} dates already have weather data`);

    // Fetch historical weather from Open-Meteo
    const weatherData = await fetchHistoricalWeather(
      location.latitude,
      location.longitude,
      startDate,
      endDate,
      location.timezone
    );

    // Filter to only new dates
    const newWeatherData = weatherData.filter(
      (w) => !existingDates.has(w.date)
    );

    console.log(`[Weather Backfill] ${newWeatherData.length} new days to insert`);

    if (newWeatherData.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Weather data already complete",
        location: location.name,
        dateRange: { start: startDate, end: endDate },
        daysInserted: 0,
        daysSkipped: weatherData.length,
      });
    }

    // Insert new weather records
    let inserted = 0;
    let errors = 0;

    for (const day of newWeatherData) {
      try {
        await prisma.weatherData.create({
          data: {
            locationId: location.id,
            date: new Date(day.date),
            tempHigh: day.tempHigh,
            tempLow: day.tempLow,
            tempAvg: day.tempMean,
            precipitation: day.precipitationInches,
            precipitationHours: day.precipitationHours,
            rainInches: day.rainInches,
            snowfall: day.snowfallInches,
            weatherCode: day.weatherCode,
            weatherDescription: day.weatherDescription,
            condition: mapWeatherCodeToCondition(day.weatherCode) as WeatherCondition,
            windSpeedMax: day.windSpeedMaxMph,
            isRainy: day.isRainy,
            isExtremeHeat: day.isExtremeHeat,
            isExtremeCold: day.isExtremeCold,
            isSevereWeather: day.isSevereWeather,
            isActual: true, // Historical data is actual, not forecast
          },
        });
        inserted++;
      } catch (err) {
        console.error(`[Weather Backfill] Error inserting ${day.date}:`, err);
        errors++;
      }
    }

    console.log(`[Weather Backfill] Complete: ${inserted} inserted, ${errors} errors`);

    return NextResponse.json({
      success: true,
      location: location.name,
      dateRange: { start: startDate, end: endDate },
      daysInserted: inserted,
      daysSkipped: existingDates.size,
      errors,
    });
  } catch (error) {
    console.error("[Weather Backfill] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to backfill weather data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
