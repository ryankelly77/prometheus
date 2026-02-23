import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";

interface LocationOverview {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  conceptType: string | null;
  restaurantGroupId: string;
  restaurantGroupName: string;
  healthScore: number | null;
  healthStatus: "excellent" | "good" | "warning" | "danger" | "unknown";
  totalSalesMTD: number | null;
  salesTrend: number | null; // percentage change vs prior month
  priorMonthSales: number | null;
  primeCost: number | null;
  laborPercent: number | null;
}

interface GroupedLocations {
  [groupId: string]: {
    groupName: string;
    locations: LocationOverview[];
  };
}

/**
 * GET /api/locations/overview
 * Returns all accessible locations with health scores and sales data
 */
export async function GET() {
  const auth = await requireOrganization();
  if (auth instanceof NextResponse) return auth;

  try {
    // Get current and prior month dates
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const priorMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get all locations user can access with their restaurant groups
    const locations = await prisma.location.findMany({
      where: {
        restaurantGroup: {
          organizationId: auth.organization.id,
        },
        isActive: true,
      },
      include: {
        restaurantGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        healthScoreConfig: {
          select: {
            thresholds: true,
          },
        },
        healthScoreHistory: {
          where: {
            month: currentMonth,
          },
          orderBy: {
            month: "desc",
          },
          take: 1,
          select: {
            overallScore: true,
          },
        },
        monthlyMetrics: {
          where: {
            month: {
              in: [currentMonth, priorMonth],
            },
          },
          orderBy: {
            month: "desc",
          },
          take: 2,
          select: {
            month: true,
            totalSales: true,
            primeCost: true,
            laborPercent: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Process locations into overview format
    const locationOverviews: LocationOverview[] = locations.map((loc) => {
      const healthScore = loc.healthScoreHistory[0]?.overallScore
        ? Number(loc.healthScoreHistory[0].overallScore)
        : null;
      const thresholds = (loc.healthScoreConfig?.thresholds as {
        excellent?: number;
        good?: number;
        warning?: number;
      }) || { excellent: 100, good: 90, warning: 80 };

      // Determine health status
      let healthStatus: LocationOverview["healthStatus"] = "unknown";
      if (healthScore !== null) {
        if (healthScore >= (thresholds.excellent ?? 100)) {
          healthStatus = "excellent";
        } else if (healthScore >= (thresholds.good ?? 90)) {
          healthStatus = "good";
        } else if (healthScore >= (thresholds.warning ?? 80)) {
          healthStatus = "warning";
        } else {
          healthStatus = "danger";
        }
      }

      // Get current and prior month sales
      const currentMetrics = loc.monthlyMetrics.find(
        (m) => m.month.getTime() === currentMonth.getTime()
      );
      const priorMetrics = loc.monthlyMetrics.find(
        (m) => m.month.getTime() === priorMonth.getTime()
      );

      // Convert Decimal to number
      const totalSalesMTD = currentMetrics?.totalSales
        ? Number(currentMetrics.totalSales)
        : null;
      const priorMonthSales = priorMetrics?.totalSales
        ? Number(priorMetrics.totalSales)
        : null;

      // Calculate trend percentage
      let salesTrend: number | null = null;
      if (totalSalesMTD !== null && priorMonthSales !== null && priorMonthSales > 0) {
        salesTrend = ((totalSalesMTD - priorMonthSales) / priorMonthSales) * 100;
      }

      // Get prime cost and labor percent from current month
      const primeCost = currentMetrics?.primeCost
        ? Number(currentMetrics.primeCost)
        : null;
      const laborPercent = currentMetrics?.laborPercent
        ? Number(currentMetrics.laborPercent)
        : null;

      return {
        id: loc.id,
        name: loc.name,
        city: loc.city,
        state: loc.state,
        conceptType: loc.conceptType,
        restaurantGroupId: loc.restaurantGroup.id,
        restaurantGroupName: loc.restaurantGroup.name,
        healthScore: healthScore !== null ? Math.round(healthScore) : null,
        healthStatus,
        totalSalesMTD,
        salesTrend: salesTrend !== null ? Math.round(salesTrend * 10) / 10 : null,
        priorMonthSales,
        primeCost,
        laborPercent,
      };
    });

    // Group by restaurant group
    const grouped: GroupedLocations = {};
    for (const loc of locationOverviews) {
      if (!grouped[loc.restaurantGroupId]) {
        grouped[loc.restaurantGroupId] = {
          groupName: loc.restaurantGroupName,
          locations: [],
        };
      }
      grouped[loc.restaurantGroupId].locations.push(loc);
    }

    // Calculate summary stats
    const summary = {
      total: locationOverviews.length,
      excellent: locationOverviews.filter((l) => l.healthStatus === "excellent").length,
      good: locationOverviews.filter((l) => l.healthStatus === "good").length,
      warning: locationOverviews.filter((l) => l.healthStatus === "warning").length,
      danger: locationOverviews.filter((l) => l.healthStatus === "danger").length,
      unknown: locationOverviews.filter((l) => l.healthStatus === "unknown").length,
    };

    return NextResponse.json({
      locations: locationOverviews,
      grouped,
      summary,
    });
  } catch (error) {
    console.error("Error fetching locations overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
