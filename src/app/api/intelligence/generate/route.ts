import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import {
  generateIntelligence,
  isClaudeConfigured,
  type IntelligenceRequest,
} from "@/lib/ai/claude";

const requestSchema = z.object({
  locationId: z.string(),
  dataType: z.enum(["pos", "accounting", "combined"]),
});

/**
 * POST /api/intelligence/generate
 *
 * Generates AI insights based on synced data for a location.
 * Used during onboarding to reveal intelligence after data sync.
 */
export async function POST(request: NextRequest) {
  // Auth check
  const auth = await requireRole("VIEWER");
  if (auth instanceof Response) {
    return auth;
  }

  // Check if Claude is configured
  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { locationId, dataType } = requestSchema.parse(body);

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

    // Build the intelligence request based on available data
    const intelligenceRequest: IntelligenceRequest = {
      locationName: location.name,
      dataType,
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
    const intelligence = await generateIntelligence(intelligenceRequest);

    // Update onboarding state
    await updateOnboardingState(locationId, dataType);

    return NextResponse.json({
      success: true,
      intelligence,
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
    return NextResponse.json(
      { error: "Failed to generate intelligence" },
      { status: 500 }
    );
  }
}

/**
 * Fetch and aggregate sales data for intelligence generation
 */
async function fetchSalesData(locationId: string) {
  // Get transaction summaries for the last 7 months
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

  // Calculate aggregates
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

  // Group by day of week to find patterns
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

  // Calculate average by day
  const dayAverages = Object.entries(dayTotals)
    .map(([day, values]) => ({
      day,
      revenue: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Determine trend (compare first half vs second half)
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
  const trendThreshold = 0.05; // 5% change threshold
  if (recentAvg > olderAvg * (1 + trendThreshold)) {
    trend = "up";
  } else if (recentAvg < olderAvg * (1 - trendThreshold)) {
    trend = "down";
  }

  // Calculate months of data
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
  // Get monthly metrics for cost analysis
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

  // Calculate aggregates
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

  // Determine trend
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
  const trendThreshold = 0.02; // 2% change threshold for costs
  // For costs, "up" is bad, "down" is good
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
  // Find the relevant integration based on data type
  let integrationType: "TOAST" | "SQUARE" | "R365" | "MARGINEDGE" | undefined;

  if (dataType === "pos") {
    // Check for POS integrations
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
    // Check for accounting integrations
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

  // Update the integration's onboarding step
  if (integrationType) {
    await prisma.integration.updateMany({
      where: {
        locationId,
        type: integrationType,
      },
      data: {
        onboardingStep: dataType === "pos" ? 3 : 5, // Step 3 = POS insights revealed, Step 5 = Accounting insights revealed
      },
    });
  }
}
