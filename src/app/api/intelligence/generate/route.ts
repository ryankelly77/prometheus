import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import {
  generateIntelligence,
  isClaudeConfigured,
  type IntelligenceRequest,
  type RestaurantType,
} from "@/lib/ai/claude";
import { analyzeWeatherCorrelations, getClimateContext, getWeatherSummaryForAI } from "@/lib/weather/correlations";
import { fetchForecast } from "@/lib/weather/open-meteo";
import {
  calculateConfidence,
  getHedgeInstructions,
  formatConfidenceBar,
  type IntelligenceConfidence,
} from "@/lib/intelligence/confidence";
import { AI_RULES } from "@/lib/ai/prompts";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const requestSchema = z.object({
  locationId: z.string(),
  dataType: z.enum(["pos", "accounting", "combined"]),
  layer: z.enum(["sales", "weather"]).optional().default("sales"),
  forceNew: z.boolean().optional().default(false), // Force generating new batch
});

/**
 * GET /api/intelligence/generate?locationId=xxx
 *
 * Returns current insights for a location without generating new ones.
 * Used to check if insights exist before deciding to generate.
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

    // Get active/pinned insights (not hidden or archived)
    const currentInsights = await prisma.aIInsight.findMany({
      where: {
        locationId,
        status: { in: ["active", "pinned"] },
      },
      orderBy: [
        // Pinned first, then by generatedAt
        { status: "desc" }, // 'pinned' > 'active' alphabetically
        { generatedAt: "desc" },
      ],
      include: {
        feedback: {
          select: {
            id: true,
            rating: true,
            userComment: true,
            createdAt: true,
          },
        },
      },
    });

    // Get count of historical insights
    const historicalCount = await prisma.aIInsight.count({
      where: {
        locationId,
        isCurrent: false,
      },
    });

    // Get the batch generation time (from the first insight in current batch)
    const generatedAt = currentInsights.length > 0 ? currentInsights[0].generatedAt : null;
    const batchId = currentInsights.length > 0 ? currentInsights[0].batchId : null;

    // Calculate confidence
    let confidence: IntelligenceConfidence | undefined;
    try {
      confidence = await calculateConfidence(locationId);
    } catch (confError) {
      console.log("[Intelligence GET] Confidence calculation skipped:", confError instanceof Error ? confError.message : "Unknown error");
    }

    // Check for stale insights (past expiration but still active)
    const now = new Date();
    const hasStaleInsights = currentInsights.some(
      (i) => i.status === "active" && i.expiresAt && new Date(i.expiresAt) < now
    );

    return NextResponse.json({
      hasInsights: currentInsights.length > 0,
      hasStaleInsights,
      insights: currentInsights.map((insight) => ({
        id: insight.id,
        title: insight.title,
        headline: insight.headline || insight.title,
        content: insight.content,
        detail: insight.detail,
        keyPoints: insight.keyPoints,
        recommendations: insight.recommendations,
        recommendation: insight.recommendation,
        impact: insight.impact,
        layer: insight.layer || "sales",
        status: insight.status,
        expiresAt: insight.expiresAt,
        isStale: insight.status === "active" && insight.expiresAt && new Date(insight.expiresAt) < now,
        insightType: insight.insightType || "trend",
        generatedAt: insight.generatedAt,
        feedback: insight.feedback,
      })),
      batchId,
      generatedAt,
      historicalCount,
      locationName: location.name,
      confidence: confidence ? {
        score: confidence.score,
        level: confidence.level,
        disclaimer: confidence.disclaimer,
        connectedLayers: confidence.connectedLayers,
        missingLayers: confidence.missingLayers.map((l) => ({ id: l.id, label: l.label })),
        nextRecommended: confidence.nextRecommended ? {
          id: confidence.nextRecommended.id,
          label: confidence.nextRecommended.label,
        } : null,
      } : null,
    });
  } catch (error) {
    console.error("Insights fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch insights", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/intelligence/generate
 *
 * Generates AI insights based on synced data for a location.
 * If forceNew=false (default), returns existing current insights if they exist.
 * If forceNew=true, generates a new batch and marks previous as historical.
 */
export async function POST(request: NextRequest) {
  // Auth check
  const auth = await requireRole("VIEWER");
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const body = await request.json();
    const { locationId, dataType, layer, forceNew } = requestSchema.parse(body);

    // Verify location belongs to user's organization
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        restaurantGroup: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check for existing active/pinned insights (unless forceNew is true)
    if (!forceNew) {
      const existingInsights = await prisma.aIInsight.findMany({
        where: {
          locationId,
          status: { in: ["active", "pinned"] },
        },
        orderBy: [
          { status: "desc" }, // pinned first
          { generatedAt: "desc" },
        ],
        include: {
          feedback: {
            select: {
              id: true,
              rating: true,
              userComment: true,
              createdAt: true,
            },
          },
        },
      });

      if (existingInsights.length > 0) {
        // Return existing insights without generating new ones
        console.log("[Intelligence] Returning existing insights for location:", locationId);

        const historicalCount = await prisma.aIInsight.count({
          where: { locationId, isCurrent: false },
        });

        // Calculate confidence for cached response too
        let cachedConfidence: IntelligenceConfidence | undefined;
        try {
          cachedConfidence = await calculateConfidence(locationId);
        } catch (confError) {
          console.log("[Intelligence] Confidence calculation skipped:", confError instanceof Error ? confError.message : "Unknown error");
        }

        const now = new Date();
        return NextResponse.json({
          success: true,
          fromCache: true,
          hasStaleInsights: existingInsights.some(
            (i) => i.status === "active" && i.expiresAt && new Date(i.expiresAt) < now
          ),
          insights: existingInsights.map((insight) => ({
            id: insight.id,
            title: insight.title,
            headline: insight.headline || insight.title,
            content: insight.content,
            detail: insight.detail,
            keyPoints: insight.keyPoints,
            recommendations: insight.recommendations,
            recommendation: insight.recommendation,
            impact: insight.impact,
            layer: insight.layer || "sales",
            status: insight.status,
            expiresAt: insight.expiresAt,
            isStale: insight.status === "active" && insight.expiresAt && new Date(insight.expiresAt) < now,
            insightType: insight.insightType || "trend",
            generatedAt: insight.generatedAt,
            feedback: insight.feedback,
          })),
          batchId: existingInsights[0].batchId,
          generatedAt: existingInsights[0].generatedAt,
          historicalCount,
          dataType,
          locationName: location.name,
          confidence: cachedConfidence ? {
            score: cachedConfidence.score,
            level: cachedConfidence.level,
            disclaimer: cachedConfidence.disclaimer,
            connectedLayers: cachedConfidence.connectedLayers,
            missingLayers: cachedConfidence.missingLayers.map((l) => ({ id: l.id, label: l.label })),
            nextRecommended: cachedConfidence.nextRecommended ? {
              id: cachedConfidence.nextRecommended.id,
              label: cachedConfidence.nextRecommended.label,
            } : null,
          } : null,
        });
      }
    }

    // Check if Claude is configured
    if (!isClaudeConfigured()) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    // Build the intelligence request based on available data
    const intelligenceRequest: IntelligenceRequest = {
      locationId,
      locationName: location.name,
      dataType,
      restaurantType: location.restaurantType as RestaurantType | null,
      city: location.city,
      state: location.state,
    };

    // Fetch sales data if requested
    if (dataType === "pos" || dataType === "combined") {
      const salesData = await fetchSalesData(locationId);
      if (salesData) {
        intelligenceRequest.salesData = salesData;
      }
    }

    // Fetch cost data if requested
    if (dataType === "accounting" || dataType === "combined") {
      const costData = await fetchCostData(locationId);
      if (costData) {
        intelligenceRequest.costData = costData;
      }
    }

    // Check if we have any data to analyze
    if (!intelligenceRequest.salesData && !intelligenceRequest.costData) {
      return NextResponse.json(
        {
          error: "No data available",
          message: "Please sync data before generating insights",
        },
        { status: 400 }
      );
    }

    // Generate intelligence based on layer
    console.log("[Intelligence] Generating NEW insights for location:", locationId, "dataType:", dataType, "layer:", layer, "forceNew:", forceNew);

    let intelligence;
    let insightLayer = layer;

    // Calculate intelligence confidence
    let confidence: IntelligenceConfidence | undefined;
    try {
      confidence = await calculateConfidence(locationId);
      console.log(`[Intelligence] Confidence: ${confidence.score}% (${confidence.level})`);
    } catch (confError) {
      console.log("[Intelligence] Confidence calculation skipped:", confError instanceof Error ? confError.message : "Unknown error");
    }

    if (layer === "weather") {
      // Generate weather-specific insights
      try {
        intelligence = await generateWeatherIntelligence(locationId, location, confidence);
        console.log("[Intelligence] Successfully generated weather insights:", intelligence.title);
      } catch (aiError) {
        console.error("[Intelligence] Weather insight generation error:", aiError);
        throw aiError;
      }
    } else {
      // Generate standard sales/cost insights
      try {
        intelligence = await generateIntelligence(intelligenceRequest);
        console.log("[Intelligence] Successfully generated:", intelligence.title);
        insightLayer = "sales";
      } catch (aiError) {
        console.error("[Intelligence] Claude API error:", aiError);
        throw aiError;
      }
    }

    // Generate a new batch ID
    const batchId = randomUUID();

    // Archive previous active/stale insights for this layer (not pinned or hidden)
    // This maintains the 5 insight cap and allows fresh insights
    await prisma.aIInsight.updateMany({
      where: {
        locationId,
        layer: insightLayer,
        status: { in: ["active", "stale"] },
      },
      data: {
        status: "archived",
        isCurrent: false,
      },
    });

    // Ensure we have a prompt record
    const promptSlug = `onboarding-${dataType}`;
    const prompt = await prisma.aIPrompt.upsert({
      where: { id: promptSlug },
      create: {
        id: promptSlug,
        organizationId: location.restaurantGroup.organizationId,
        name: `Onboarding ${dataType.toUpperCase()} Analysis`,
        slug: promptSlug,
        systemPrompt: "You are a restaurant analytics expert.",
        userPromptTemplate: "Analyze the provided data and generate insights.",
        category: "METRIC_ANALYSIS",
        version: 1,
        isActive: true,
      },
      update: {},
    });

    const now = new Date();
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    // Default expiration: 14 days from now
    const defaultExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create individual insight records for each insight
    const createdInsights = [];

    // Create main summary insight
    const mainInsight = await prisma.aIInsight.create({
      data: {
        locationId,
        promptId: prompt.id,
        batchId,
        isCurrent: true,
        layer: insightLayer,
        status: "active",
        insightType: "trend",
        periodType: "MONTHLY",
        periodStart: sevenMonthsAgo,
        periodEnd: now,
        inputData: intelligenceRequest as object,
        title: intelligence.title,
        headline: intelligence.title,
        content: intelligence.summary,
        detail: intelligence.summary,
        keyPoints: intelligence.insights,
        recommendations: intelligence.recommendations as object,
        expiresAt: defaultExpiresAt,
        model: "claude-sonnet-4-5-20250929",
        promptVersion: 1,
      },
    });
    createdInsights.push(mainInsight);

    // Create separate insights for each key point (so they can have individual feedback)
    // Cap at 4 additional insights (5 total per layer including main)
    const insightsToCreate = intelligence.insights.slice(0, 4);
    for (let i = 0; i < insightsToCreate.length; i++) {
      const insightText = insightsToCreate[i];
      const recommendation = intelligence.recommendations[i] || null;

      const individualInsight = await prisma.aIInsight.create({
        data: {
          locationId,
          promptId: prompt.id,
          batchId,
          isCurrent: true,
          layer: insightLayer,
          status: "active",
          insightType: i === insightsToCreate.length - 1 ? "opportunity" : "trend",
          periodType: "MONTHLY",
          periodStart: sevenMonthsAgo,
          periodEnd: now,
          inputData: {},
          title: `Insight ${i + 1}`,
          headline: insightText.slice(0, 100),
          content: insightText,
          detail: insightText,
          keyPoints: [insightText],
          recommendation: recommendation,
          recommendations: recommendation ? [recommendation] : [],
          expiresAt: defaultExpiresAt,
          model: "claude-sonnet-4-5-20250929",
          promptVersion: 1,
        },
      });
      createdInsights.push(individualInsight);
    }

    // Update onboarding state
    await updateOnboardingState(locationId, dataType);

    // Get historical count
    const historicalCount = await prisma.aIInsight.count({
      where: { locationId, isCurrent: false },
    });

    return NextResponse.json({
      success: true,
      fromCache: false,
      hasStaleInsights: false,
      intelligence, // Keep for backward compatibility
      insights: createdInsights.map((insight) => ({
        id: insight.id,
        title: insight.title,
        headline: insight.headline || insight.title,
        content: insight.content,
        detail: insight.detail,
        keyPoints: insight.keyPoints,
        recommendations: insight.recommendations,
        recommendation: insight.recommendation,
        impact: insight.impact,
        layer: insight.layer,
        status: insight.status,
        expiresAt: insight.expiresAt,
        isStale: false,
        insightType: insight.insightType,
        generatedAt: insight.generatedAt,
        feedback: [],
      })),
      batchId,
      generatedAt: now,
      historicalCount,
      dataType,
      locationName: location.name,
      confidence: confidence ? {
        score: confidence.score,
        level: confidence.level,
        disclaimer: confidence.disclaimer,
        connectedLayers: confidence.connectedLayers,
        missingLayers: confidence.missingLayers.map((l) => ({ id: l.id, label: l.label })),
        nextRecommended: confidence.nextRecommended ? {
          id: confidence.nextRecommended.id,
          label: confidence.nextRecommended.label,
        } : null,
      } : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Intelligence generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[Intelligence] Error details:", { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: "Failed to generate intelligence", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Fetch and aggregate sales data for intelligence generation
 */
async function fetchSalesData(locationId: string) {
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
  sevenMonthsAgo.setDate(1);

  const transactions = await prisma.transactionSummary.findMany({
    where: {
      locationId,
      date: { gte: sevenMonthsAgo },
    },
    orderBy: { date: "desc" },
  });

  if (transactions.length === 0) {
    return null;
  }

  const totalRevenue = transactions.reduce(
    (sum, tx) => sum + Number(tx.netSales),
    0
  );
  const transactionCount = transactions.reduce(
    (sum, tx) => sum + (tx.transactionCount ?? 0),
    0
  );
  const avgDailyRevenue = totalRevenue / transactions.length;
  const avgCheckSize =
    transactionCount > 0 ? totalRevenue / transactionCount : 0;

  const dayTotals: Record<string, number[]> = {};
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const tx of transactions) {
    const dayOfWeek = new Date(tx.date).getDay();
    const dayName = dayNames[dayOfWeek];
    if (!dayTotals[dayName]) {
      dayTotals[dayName] = [];
    }
    dayTotals[dayName].push(Number(tx.netSales));
  }

  const dayAverages = Object.entries(dayTotals)
    .map(([day, values]) => ({
      day,
      revenue: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const midpoint = Math.floor(transactions.length / 2);
  const recentHalf = transactions.slice(0, midpoint);
  const olderHalf = transactions.slice(midpoint);

  const recentAvg =
    recentHalf.reduce((sum, tx) => sum + Number(tx.netSales), 0) /
    (recentHalf.length || 1);
  const olderAvg =
    olderHalf.reduce((sum, tx) => sum + Number(tx.netSales), 0) /
    (olderHalf.length || 1);

  let trend: "up" | "down" | "flat" = "flat";
  const trendThreshold = 0.05;
  if (recentAvg > olderAvg * (1 + trendThreshold)) {
    trend = "up";
  } else if (recentAvg < olderAvg * (1 - trendThreshold)) {
    trend = "down";
  }

  const uniqueMonths = new Set(
    transactions.map((tx) => {
      const date = new Date(tx.date);
      return `${date.getFullYear()}-${date.getMonth()}`;
    })
  );

  return {
    months: uniqueMonths.size,
    totalRevenue: Math.round(totalRevenue),
    avgDailyRevenue: Math.round(avgDailyRevenue),
    topDays: dayAverages.slice(0, 2),
    slowDays: dayAverages.slice(-2).reverse(),
    transactionCount,
    avgCheckSize,
    trend,
  };
}

/**
 * Fetch and aggregate cost data for intelligence generation
 */
async function fetchCostData(locationId: string) {
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
  sevenMonthsAgo.setDate(1);

  const monthlyMetrics = await prisma.monthlyMetrics.findMany({
    where: {
      locationId,
      month: { gte: sevenMonthsAgo },
    },
    orderBy: { month: "desc" },
  });

  if (monthlyMetrics.length === 0) {
    return null;
  }

  const totalCosts = monthlyMetrics.reduce((sum, m) => {
    const labor = Number(m.laborCost ?? 0);
    const food = Number(m.foodCost ?? 0);
    return sum + labor + food;
  }, 0);

  const avgLaborPercent =
    monthlyMetrics.reduce((sum, m) => sum + Number(m.laborPercent ?? 0), 0) /
    monthlyMetrics.length;
  const avgFoodPercent =
    monthlyMetrics.reduce((sum, m) => sum + Number(m.foodPercent ?? 0), 0) /
    monthlyMetrics.length;
  const avgPrimeCost =
    monthlyMetrics.reduce((sum, m) => sum + Number(m.primeCost ?? 0), 0) /
    monthlyMetrics.length;

  const midpoint = Math.floor(monthlyMetrics.length / 2);
  const recentHalf = monthlyMetrics.slice(0, midpoint);
  const olderHalf = monthlyMetrics.slice(midpoint);

  const recentPrime =
    recentHalf.reduce((sum, m) => sum + Number(m.primeCost ?? 0), 0) /
    (recentHalf.length || 1);
  const olderPrime =
    olderHalf.reduce((sum, m) => sum + Number(m.primeCost ?? 0), 0) /
    (olderHalf.length || 1);

  let trend: "up" | "down" | "flat" = "flat";
  const trendThreshold = 0.02;
  if (recentPrime > olderPrime * (1 + trendThreshold)) {
    trend = "up";
  } else if (recentPrime < olderPrime * (1 - trendThreshold)) {
    trend = "down";
  }

  return {
    months: monthlyMetrics.length,
    totalCosts: Math.round(totalCosts),
    laborPercent: avgLaborPercent,
    foodPercent: avgFoodPercent,
    primeCost: avgPrimeCost,
    trend,
  };
}

/**
 * Update onboarding state after generating insights
 */
async function updateOnboardingState(
  locationId: string,
  dataType: "pos" | "accounting" | "combined"
) {
  let integrationType: "TOAST" | "SQUARE" | "R365" | "MARGINEDGE" | undefined;

  if (dataType === "pos") {
    const posIntegration = await prisma.integration.findFirst({
      where: {
        locationId,
        type: { in: ["TOAST", "SQUARE", "CLOVER", "REVEL"] },
        status: "CONNECTED",
      },
    });
    if (posIntegration) {
      integrationType = posIntegration.type as "TOAST" | "SQUARE";
    }
  } else if (dataType === "accounting") {
    const accountingIntegration = await prisma.integration.findFirst({
      where: {
        locationId,
        type: { in: ["R365", "MARGINEDGE", "QUICKBOOKS"] },
        status: "CONNECTED",
      },
    });
    if (accountingIntegration) {
      integrationType = accountingIntegration.type as "R365" | "MARGINEDGE";
    }
  }

  if (integrationType) {
    await prisma.integration.updateMany({
      where: {
        locationId,
        type: integrationType,
      },
      data: {
        onboardingStep: dataType === "pos" ? 3 : 5,
      },
    });
  }
}

/**
 * Generate weather-specific insights
 * These insights are ONLY possible because of weather data
 */
async function generateWeatherIntelligence(
  locationId: string,
  location: { name: string; latitude: number | null; longitude: number | null; timezone: string | null; restaurantType: string | null },
  confidence?: IntelligenceConfidence
): Promise<{ title: string; summary: string; insights: string[]; recommendations: string[]; dataQuality: "excellent" | "good" | "limited" }> {
  // Fetch previous insights by status for context
  const previousInsights = await prisma.aIInsight.findMany({
    where: {
      locationId,
      layer: "weather",
      status: { in: ["archived", "hidden", "pinned"] },
    },
    orderBy: { generatedAt: "desc" },
    take: 20,
    select: {
      title: true,
      headline: true,
      content: true,
      status: true,
    },
  });

  // Also fetch sales-only insights (to avoid repeating)
  const salesInsights = await prisma.aIInsight.findMany({
    where: {
      locationId,
      layer: "sales",
    },
    orderBy: { generatedAt: "desc" },
    take: 10,
    select: {
      title: true,
      headline: true,
      content: true,
    },
  });

  // Get weather correlations
  const correlations = await analyzeWeatherCorrelations(locationId);

  if (correlations.totalDaysAnalyzed === 0) {
    throw new Error("No weather data available for this location. Run weather backfill first.");
  }

  // Get climate context
  let climateContext: string | undefined;
  if (location.latitude && location.longitude) {
    climateContext = getClimateContext(location.latitude, location.longitude);
  }

  // Get weather summary for AI
  const weatherSummary = getWeatherSummaryForAI(correlations, climateContext);

  // Fetch 7-day forecast
  let forecastSection = "";
  if (location.latitude && location.longitude) {
    try {
      const forecast = await fetchForecast(
        location.latitude,
        location.longitude,
        7,
        location.timezone || undefined
      );

      // Calculate expected impacts based on correlations
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      // Get DOW averages for impact calculations
      const transactions = await prisma.transactionSummary.findMany({
        where: { locationId },
        orderBy: { date: "desc" },
        take: 365,
      });

      const dowTotals: Record<string, { total: number; count: number }> = {};
      for (const tx of transactions) {
        const dayName = dayNames[new Date(tx.date).getDay()];
        if (!dowTotals[dayName]) {
          dowTotals[dayName] = { total: 0, count: 0 };
        }
        dowTotals[dayName].total += Number(tx.netSales);
        dowTotals[dayName].count += 1;
      }

      const dowAverages: Record<string, number> = {};
      for (const [day, data] of Object.entries(dowTotals)) {
        dowAverages[day] = data.count > 0 ? Math.round(data.total / data.count) : 0;
      }

      forecastSection = "\n\n7-Day Forecast with Expected Impacts:\n";
      for (const day of forecast) {
        const dayOfWeek = dayNames[new Date(day.date).getDay()];
        const normalSales = dowAverages[dayOfWeek] || correlations.avgDailyRevenue;
        let expectedImpact: number | null = null;
        let reason = "";

        if (day.isSevereWeather) {
          expectedImpact = correlations.adjustedSevereWeatherImpactPct || -30;
          reason = "severe weather";
        } else if (day.isExtremeHeat) {
          expectedImpact = correlations.adjustedExtremeHeatImpactPct;
          reason = "extreme heat";
        } else if (day.isExtremeCold) {
          expectedImpact = correlations.adjustedExtremeColdImpactPct;
          reason = "extreme cold";
        } else if (day.isRainy) {
          expectedImpact = correlations.adjustedRainImpactPct;
          reason = "rain";
        }

        let line = `- ${day.date} (${dayOfWeek}): ${day.weatherDescription}, High ${Math.round(day.tempHigh)}°F`;
        if (expectedImpact !== null && expectedImpact < -3) {
          const expectedSales = Math.round(normalSales * (1 + expectedImpact / 100));
          line += ` — ${reason}: expect ~$${expectedSales.toLocaleString()} instead of usual $${normalSales.toLocaleString()} (${expectedImpact}%)`;
        }
        forecastSection += line + "\n";
      }
    } catch (forecastError) {
      console.log("[Weather Intelligence] Forecast fetch failed:", forecastError);
    }
  }

  // Build insight history sections for AI context
  const archivedInsights = previousInsights.filter((i) => i.status === "archived");
  const pinnedInsights = previousInsights.filter((i) => i.status === "pinned");
  const hiddenInsights = previousInsights.filter((i) => i.status === "hidden");

  let insightHistorySection = "";

  if (archivedInsights.length > 0) {
    insightHistorySection += `\n\nPREVIOUS INSIGHTS (do not repeat these):\n${archivedInsights.map((i) => `- ${i.title || i.headline}`).join("\n")}`;
  }

  if (pinnedInsights.length > 0) {
    insightHistorySection += `\n\nINSIGHTS THE USER LIKED (generate more like these):\n${pinnedInsights.map((i) => `- ${i.title || i.headline}: ${i.content?.slice(0, 100)}...`).join("\n")}`;
  }

  if (hiddenInsights.length > 0) {
    insightHistorySection += `\n\nINSIGHTS THE USER DISLIKED (avoid this style/topic):\n${hiddenInsights.map((i) => `- ${i.title || i.headline}`).join("\n")}`;
  }

  // Build the prompt
  const previousInsightsSection = salesInsights.length > 0
    ? `\n\nPrevious Sales-Only Insights (DO NOT REPEAT - these are already known):\n${salesInsights.map((i) => `- ${i.headline || i.title}: ${i.content?.slice(0, 100)}...`).join("\n")}`
    : "";

  // Find unexplained anomalies from previous insights
  const anomalySection = correlations.weatherExplainedAnomalies.length > 0
    ? `\n\nPreviously Unexplained Anomalies — NOW EXPLAINED BY WEATHER:\n${correlations.weatherExplainedAnomalies.map((a) =>
        `- ${a.date} (${a.dayOfWeek}): Sales $${a.sales.toLocaleString()} (${a.pctDiff > 0 ? "+" : ""}${a.pctDiff}% vs expected $${a.expectedSales.toLocaleString()}) — ${a.explanation}`
      ).join("\n")}\n\nIMPORTANT: If any previous insight mentioned an unexplained anomaly on these dates, SOLVE IT with the weather explanation above.`
    : "";

  // Build confidence section
  const confidenceSection = confidence
    ? `\n== DATA CONFIDENCE ==
Data Completeness: ${formatConfidenceBar(confidence.score)} (${confidence.level})
Connected Sources: ${confidence.connectedLayers.join(", ") || "None"}
${confidence.missingLayers.length > 0 ? `Missing Sources: ${confidence.missingLayers.slice(0, 3).map((l) => l.label).join(", ")}` : ""}
${confidence.disclaimer}
`
    : "";

  const prompt = `You are a restaurant analytics expert with NEW weather data for ${location.name}.
${confidenceSection}
${weatherSummary}
${forecastSection}
${anomalySection}
${previousInsightsSection}
${insightHistorySection}

CRITICAL: Generate EXACTLY 3 insights. Not more. Not less.

Do NOT repeat revenue patterns already covered in sales insights. Focus ONLY on weather-specific analysis.

Your 3 insights MUST be:

1. "MYSTERY SOLVED" — Pick the most dramatic anomaly from the weather-explained anomalies above. Example: "That -23% Tuesday wasn't a mystery — it was 98°F with 70% humidity. Your customers stayed home."

2. "THE #1 WEATHER DRIVER" — Use the ranked weather drivers data. State the annual cost clearly. Example: "Extreme heat costs you ~$47K/year — more than rain ($23K) and severe weather ($8K) combined."

3. "THIS WEEK'S FORECAST" — Specific predictions with dollar estimates for the next 7 days based on the forecast above. Example: "Saturday's forecasted 96°F will likely cost you $1,200-1,500 vs normal. Consider adding patio misters or running a heat-wave special."

Each insight MUST include specific numbers from the data above.

Recommendations should be embedded in the insights, not separate cards.

Return as JSON:
{
  "title": "Weather Impact Analysis",
  "summary": "2-sentence summary of weather's overall impact",
  "insights": [
    "EXACTLY the mystery solved insight with specific date and numbers",
    "EXACTLY the #1 driver insight with annual cost",
    "EXACTLY the forecast insight with this week's predictions"
  ],
  "recommendations": [],
  "dataQuality": "excellent|good|limited"
}`;

  // Build system prompt with hedge instructions
  let systemPrompt = `You are an expert restaurant analytics consultant with weather intelligence capabilities. Generate insights that are ONLY possible because of weather data. Return valid JSON.
${AI_RULES}`;

  if (confidence) {
    const hedgeInstructions = getHedgeInstructions(confidence);
    systemPrompt += `\n\n== DATA CONFIDENCE GUIDANCE ==\n${hedgeInstructions}`;
  }

  // Call Claude
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
    system: systemPrompt,
  });

  // Extract and parse response
  const textContent = message.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonText = textContent.text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    return {
      title: "Weather Intelligence",
      summary: textContent.text.slice(0, 200),
      insights: [textContent.text],
      recommendations: [],
      dataQuality: "limited",
    };
  }
}
