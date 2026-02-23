import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";

/**
 * GET /api/locations/[id]/health-score
 * Returns health score data for a specific location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization();
  if (auth instanceof NextResponse) return auth;

  const { id: locationId } = await params;

  try {
    // Verify user has access to this location
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        restaurantGroup: {
          organizationId: auth.organization.id,
        },
        isActive: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found or access denied" },
        { status: 404 }
      );
    }

    // Get current month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch health score history (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const healthHistory = await prisma.healthScoreHistory.findMany({
      where: {
        locationId,
        month: {
          gte: twelveMonthsAgo,
        },
      },
      orderBy: {
        month: "desc",
      },
    });

    // Get health score config
    const config = await prisma.healthScoreConfig.findUnique({
      where: { locationId },
    });

    // Current health score
    const currentScore = healthHistory.find(
      (h) => h.month.getTime() === currentMonth.getTime()
    );

    // Determine status
    const thresholds = (config?.thresholds as {
      excellent?: number;
      good?: number;
      warning?: number;
    }) || { excellent: 100, good: 90, warning: 80 };

    const score = currentScore?.overallScore
      ? Number(currentScore.overallScore)
      : null;

    let status: "excellent" | "good" | "warning" | "danger" | "unknown" = "unknown";
    if (score !== null) {
      if (score >= (thresholds.excellent ?? 100)) {
        status = "excellent";
      } else if (score >= (thresholds.good ?? 90)) {
        status = "good";
      } else if (score >= (thresholds.warning ?? 80)) {
        status = "warning";
      } else {
        status = "danger";
      }
    }

    // Format trend data (last 12 months)
    const trend = healthHistory
      .map((h) => ({
        month: h.month.toISOString(),
        score: Number(h.overallScore),
        status: h.status,
      }))
      .reverse();

    // Get metric breakdown from current score
    const breakdown = currentScore?.metricScores as Record<
      string,
      { score: number; weight: number; weighted: number }
    > | null;

    // Format breakdown for display
    const formattedBreakdown = breakdown
      ? Object.entries(breakdown).map(([metric, data]) => ({
          metric: metric
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim(),
          score: Math.round(data.score * 10) / 10,
          weight: data.weight,
          weightedScore: Math.round(data.weighted * 10) / 10,
        }))
      : [];

    return NextResponse.json({
      locationId,
      overallScore: score ? Math.round(score * 100) / 100 : null,
      status,
      trend,
      breakdown: formattedBreakdown,
      config: config
        ? {
            weights: config.weights,
            targets: config.targets,
            thresholds: config.thresholds,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching health score:", error);
    return NextResponse.json(
      { error: "Failed to fetch health score" },
      { status: 500 }
    );
  }
}
