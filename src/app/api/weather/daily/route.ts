import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

/**
 * GET /api/weather/daily?locationId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns weather data for a date range from the database.
 * Used for displaying weather alongside sales data in charts and tables.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

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
      },
    });
  }

  if (!location) {
    return NextResponse.json(
      { error: "Location not found" },
      { status: 404 }
    );
  }

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};

  if (startDateStr) {
    dateFilter.gte = new Date(startDateStr);
  }
  if (endDateStr) {
    dateFilter.lte = new Date(endDateStr);
  }

  // Default to last 30 days if no dates specified
  if (!startDateStr && !endDateStr) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    dateFilter.gte = thirtyDaysAgo;
  }

  try {
    const weatherData = await prisma.weatherData.findMany({
      where: {
        locationId: location.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        tempHigh: true,
        tempLow: true,
        tempAvg: true,
        precipitation: true,
        precipitationHours: true,
        rainInches: true,
        snowfall: true,
        weatherCode: true,
        weatherDescription: true,
        condition: true,
        windSpeed: true,
        windSpeedMax: true,
        windGusts: true,
        humidity: true,
        cloudCover: true,
        isRainy: true,
        isExtremeHeat: true,
        isExtremeCold: true,
        isSevereWeather: true,
        isActual: true,
      },
    });

    return NextResponse.json({
      location: location.name,
      locationId: location.id,
      count: weatherData.length,
      data: weatherData.map((w) => ({
        ...w,
        date: w.date.toISOString().slice(0, 10),
      })),
    });
  } catch (error) {
    console.error("[Weather Daily] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch weather data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
