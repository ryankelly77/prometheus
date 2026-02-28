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

const requestSchema = z.object({
  locationId: z.string(),
  dataType: z.enum(["pos", "accounting", "combined"]),
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

    // Get current insights (isCurrent = true)
    const currentInsights = await prisma.aIInsight.findMany({
      where: {
        locationId,
        isCurrent: true,
      },
      orderBy: { generatedAt: "desc" },
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

    return NextResponse.json({
      hasInsights: currentInsights.length > 0,
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
        insightType: insight.insightType || "trend",
        generatedAt: insight.generatedAt,
        feedback: insight.feedback,
      })),
      batchId,
      generatedAt,
      historicalCount,
      locationName: location.name,
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
    const { locationId, dataType, forceNew } = requestSchema.parse(body);

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

    // Check for existing current insights (unless forceNew is true)
    if (!forceNew) {
      const existingInsights = await prisma.aIInsight.findMany({
        where: {
          locationId,
          isCurrent: true,
        },
        orderBy: { generatedAt: "desc" },
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

        return NextResponse.json({
          success: true,
          fromCache: true,
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
            insightType: insight.insightType || "trend",
            generatedAt: insight.generatedAt,
            feedback: insight.feedback,
          })),
          batchId: existingInsights[0].batchId,
          generatedAt: existingInsights[0].generatedAt,
          historicalCount,
          dataType,
          locationName: location.name,
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

    // Generate intelligence
    console.log("[Intelligence] Generating NEW insights for location:", locationId, "dataType:", dataType, "forceNew:", forceNew);

    let intelligence;
    try {
      intelligence = await generateIntelligence(intelligenceRequest);
      console.log("[Intelligence] Successfully generated:", intelligence.title);
    } catch (aiError) {
      console.error("[Intelligence] Claude API error:", aiError);
      throw aiError;
    }

    // Generate a new batch ID
    const batchId = randomUUID();

    // Mark all previous insights for this location as not current
    await prisma.aIInsight.updateMany({
      where: {
        locationId,
        isCurrent: true,
      },
      data: {
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

    // Create individual insight records for each insight
    const createdInsights = [];

    // Create main summary insight
    const mainInsight = await prisma.aIInsight.create({
      data: {
        locationId,
        promptId: prompt.id,
        batchId,
        isCurrent: true,
        layer: "sales",
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
        model: "claude-sonnet-4-5-20250929",
        promptVersion: 1,
      },
    });
    createdInsights.push(mainInsight);

    // Create separate insights for each key point (so they can have individual feedback)
    for (let i = 0; i < intelligence.insights.length; i++) {
      const insightText = intelligence.insights[i];
      const recommendation = intelligence.recommendations[i] || null;

      const individualInsight = await prisma.aIInsight.create({
        data: {
          locationId,
          promptId: prompt.id,
          batchId,
          isCurrent: true,
          layer: "sales",
          insightType: i === intelligence.insights.length - 1 ? "opportunity" : "trend",
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
        insightType: insight.insightType,
        generatedAt: insight.generatedAt,
        feedback: [],
      })),
      batchId,
      generatedAt: now,
      historicalCount,
      dataType,
      locationName: location.name,
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
