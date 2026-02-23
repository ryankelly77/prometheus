import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth";

/**
 * GET /api/locations/[id]/metrics
 * Returns MonthlyMetrics for a specific location
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
      include: {
        restaurantGroup: {
          select: { name: true },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found or access denied" },
        { status: 404 }
      );
    }

    // Get current and prior months
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const priorMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Fetch monthly metrics (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const monthlyMetrics = await prisma.monthlyMetrics.findMany({
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

    // Get current month metrics
    const currentMetrics = monthlyMetrics.find(
      (m) => m.month.getTime() === currentMonth.getTime()
    );
    const priorMetrics = monthlyMetrics.find(
      (m) => m.month.getTime() === priorMonth.getTime()
    );

    // Calculate trends
    const calculateTrend = (current: number | null, prior: number | null) => {
      if (current === null || prior === null || prior === 0) return null;
      return ((current - prior) / prior) * 100;
    };

    const salesTrend = calculateTrend(
      currentMetrics?.totalSales ? Number(currentMetrics.totalSales) : null,
      priorMetrics?.totalSales ? Number(priorMetrics.totalSales) : null
    );

    // Format metrics for response
    const formattedMetrics = monthlyMetrics.map((m) => ({
      month: m.month.toISOString(),
      totalSales: Number(m.totalSales),
      foodSales: Number(m.foodSales),
      beverageSales: Number(m.beverageSales),
      alcoholSales: m.alcoholSales ? Number(m.alcoholSales) : null,
      wineSales: m.wineSales ? Number(m.wineSales) : null,
      beerSales: m.beerSales ? Number(m.beerSales) : null,
      liquorSales: m.liquorSales ? Number(m.liquorSales) : null,
      totalCovers: m.totalCovers,
      ppa: m.ppa ? Number(m.ppa) : null,
      laborCost: m.laborCost ? Number(m.laborCost) : null,
      laborPercent: m.laborPercent ? Number(m.laborPercent) : null,
      foodCost: m.foodCost ? Number(m.foodCost) : null,
      foodPercent: m.foodPercent ? Number(m.foodPercent) : null,
      primeCost: m.primeCost ? Number(m.primeCost) : null,
      revPash: m.revPash ? Number(m.revPash) : null,
    }));

    // Current month summary
    const current = currentMetrics
      ? {
          totalSales: Number(currentMetrics.totalSales),
          foodSales: Number(currentMetrics.foodSales),
          beverageSales: Number(currentMetrics.beverageSales),
          totalCovers: currentMetrics.totalCovers,
          ppa: currentMetrics.ppa ? Number(currentMetrics.ppa) : null,
          laborPercent: currentMetrics.laborPercent ? Number(currentMetrics.laborPercent) : null,
          foodPercent: currentMetrics.foodPercent ? Number(currentMetrics.foodPercent) : null,
          primeCost: currentMetrics.primeCost ? Number(currentMetrics.primeCost) : null,
          salesTrend: salesTrend ? Math.round(salesTrend * 10) / 10 : null,
        }
      : null;

    return NextResponse.json({
      location: {
        id: location.id,
        name: location.name,
        city: location.city,
        state: location.state,
        conceptType: location.conceptType,
        groupName: location.restaurantGroup.name,
      },
      current,
      monthly: formattedMetrics,
    });
  } catch (error) {
    console.error("Error fetching location metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
