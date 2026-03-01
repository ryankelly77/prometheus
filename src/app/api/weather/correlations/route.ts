import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import {
  analyzeWeatherCorrelations,
  getWeatherSummaryForAI,
  type WeatherCorrelation,
} from "@/lib/weather/correlations";

/**
 * GET /api/weather/correlations?locationId=xxx&refresh=true
 *
 * Returns weather-sales correlation analysis for a location.
 *
 * By default, returns cached analysis from restaurant profile if available
 * and less than 24 hours old. Use refresh=true to force recalculation.
 *
 * Query params:
 *   - locationId (optional): Location to analyze. Defaults to first active location.
 *   - refresh (optional): Set to "true" to force recalculation
 *   - startDate (optional): Start of analysis period (YYYY-MM-DD)
 *   - endDate (optional): End of analysis period (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const refresh = searchParams.get("refresh") === "true";
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

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
      },
    });
  }

  if (!location) {
    return NextResponse.json(
      { error: "Location not found" },
      { status: 404 }
    );
  }

  try {
    // Check for cached data if not forcing refresh and no custom date range
    if (!refresh && !startDate && !endDate) {
      const profile = await prisma.restaurantProfile.findUnique({
        where: { locationId: location.id },
        select: { dataFacts: true },
      });

      const dataFacts = profile?.dataFacts as {
        weather?: {
          rainImpactPct: number;
          rainyDayCount: number;
          estimatedRainLoss: number;
          tempSweetSpot: { min: number; max: number };
          extremeHeatImpactPct: number;
          extremeColdImpactPct: number;
          severeWeatherEvents: number;
          weatherExplainedAnomalies: number;
          analyzedAt: string;
        };
      } | null;

      // Check if we have cached weather data less than 24 hours old
      if (dataFacts?.weather?.analyzedAt) {
        const analyzedAt = new Date(dataFacts.weather.analyzedAt);
        const hoursSinceAnalysis = (Date.now() - analyzedAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceAnalysis < 24) {
          // Return cached summary
          return NextResponse.json({
            location: location.name,
            locationId: location.id,
            cached: true,
            cachedAt: dataFacts.weather.analyzedAt,
            summary: dataFacts.weather,
            message: "Returning cached analysis. Use ?refresh=true for fresh data.",
          });
        }
      }
    }

    // Run fresh correlation analysis
    console.log(`[Weather Correlations] Running analysis for ${location.name}`);

    const correlation = await analyzeWeatherCorrelations(
      location.id,
      startDate,
      endDate
    );

    if (correlation.totalDaysAnalyzed === 0) {
      return NextResponse.json({
        location: location.name,
        locationId: location.id,
        error: "No data available for analysis",
        message: "Backfill weather data first using POST /api/weather/backfill",
        hasWeatherData: false,
      });
    }

    // Generate AI-friendly summary
    const aiSummary = getWeatherSummaryForAI(correlation);

    return NextResponse.json({
      location: location.name,
      locationId: location.id,
      cached: false,
      analyzedAt: new Date().toISOString(),
      correlation,
      aiSummary,
    });
  } catch (error) {
    console.error("[Weather Correlations] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze weather correlations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
