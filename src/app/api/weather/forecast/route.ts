import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { fetchForecast } from "@/lib/weather/open-meteo";

/**
 * GET /api/weather/forecast?locationId=xxx
 *
 * Fetches and returns a 7-day weather forecast from Open-Meteo.
 * Always fetches fresh data (not stored in database).
 * Used for proactive alerts about upcoming weather impacts.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const daysParam = searchParams.get("days");
  const forecastDays = daysParam ? Math.min(parseInt(daysParam, 10), 16) : 7;

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

  try {
    const forecast = await fetchForecast(
      location.latitude,
      location.longitude,
      forecastDays,
      location.timezone
    );

    // Identify days with potential weather impacts
    const alerts = forecast
      .filter((day) => day.isRainy || day.isExtremeHeat || day.isExtremeCold || day.isSevereWeather)
      .map((day) => {
        const issues: string[] = [];
        if (day.isSevereWeather) issues.push("severe weather");
        if (day.isExtremeHeat) issues.push("extreme heat");
        if (day.isExtremeCold) issues.push("extreme cold");
        if (day.isRainy && !day.isSevereWeather) issues.push("rain");

        return {
          date: day.date,
          dayOfWeek: new Date(day.date).toLocaleDateString("en-US", { weekday: "long" }),
          issues,
          summary: `${day.weatherDescription}, High ${Math.round(day.tempHigh)}°F`,
        };
      });

    return NextResponse.json({
      location: location.name,
      locationId: location.id,
      fetchedAt: new Date().toISOString(),
      forecastDays,
      alerts,
      data: forecast,
    });
  } catch (error) {
    console.error("[Weather Forecast] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch weather forecast",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
