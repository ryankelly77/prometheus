import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

/**
 * GET /api/sales/daily
 * Get daily sales data from TransactionSummary table
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("VIEWER");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    console.log(`[Sales API] Request params: locationId=${locationId}, startDate=${startDate}, endDate=${endDate}`);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (locationId) {
      where.locationId = locationId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Fetch transaction summaries
    const transactions = await prisma.transactionSummary.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        location: {
          select: { name: true },
        },
      },
    });

    // Get max syncedAt for the period (most recent sync for this month)
    const syncedAtResult = await prisma.transactionSummary.aggregate({
      where,
      _max: {
        syncedAt: true,
      },
    });
    const lastSyncedAt = syncedAtResult._max.syncedAt;

    // Also fetch daypart metrics for the same period
    const daypartMetrics = await prisma.daypartMetrics.findMany({
      where,
      orderBy: { date: "desc" },
    });

    // Map to response format
    const dailyData = transactions.map((tx) => {
      const dayOfWeek = new Date(tx.date).toLocaleDateString("en-US", {
        weekday: "short",
      });

      return {
        id: tx.id,
        date: tx.date.toISOString().slice(0, 10),
        dayOfWeek,
        locationId: tx.locationId,
        locationName: tx.location?.name,
        grossSales: Number(tx.grossSales),
        netSales: Number(tx.netSales),
        discounts: Number(tx.discounts),
        cashPayments: Number(tx.cashPayments),
        cardPayments: Number(tx.cardPayments),
        avgCheckSize: Number(tx.avgCheckSize),
        avgTip: Number(tx.avgTip),
        transactionCount: Number(tx.transactionCount) || 0,
        status: "synced" as const,
        syncedAt: tx.syncedAt?.toISOString(),
      };
    });

    // Calculate totals
    const totals = dailyData.reduce(
      (acc, day) => ({
        grossSales: acc.grossSales + day.grossSales,
        netSales: acc.netSales + day.netSales,
        discounts: acc.discounts + day.discounts,
        cashPayments: acc.cashPayments + day.cashPayments,
        cardPayments: acc.cardPayments + day.cardPayments,
        transactionCount: acc.transactionCount + day.transactionCount,
        syncedDays: acc.syncedDays + 1,
      }),
      {
        grossSales: 0,
        netSales: 0,
        discounts: 0,
        cashPayments: 0,
        cardPayments: 0,
        transactionCount: 0,
        syncedDays: 0,
      }
    );

    // Log what's being returned
    const dateRange = dailyData.length > 0
      ? `${dailyData[dailyData.length - 1]?.date} to ${dailyData[0]?.date}`
      : 'no data';
    console.log(`[Sales API] Returning ${dailyData.length} records, date range: ${dateRange}`);
    console.log(`[Sales API] Totals: netSales=$${totals.netSales.toFixed(2)}, grossSales=$${totals.grossSales.toFixed(2)}, orders=${totals.transactionCount}`);

    return NextResponse.json({
      data: dailyData,
      daypartMetrics,
      totals,
      count: dailyData.length,
      lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Sales data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales data" },
      { status: 500 }
    );
  }
}
