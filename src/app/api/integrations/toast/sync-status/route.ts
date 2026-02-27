import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import prisma from "@/lib/prisma";

/**
 * GET /api/integrations/toast/sync-status
 * Returns sync status for each of the last 12 months
 */
export async function GET(request: NextRequest) {
  // Auth check
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof Response) {
    return auth;
  }

  const searchParams = request.nextUrl.searchParams;
  const integrationId = searchParams.get("integrationId");

  if (!integrationId) {
    return NextResponse.json({ error: "Missing integrationId" }, { status: 400 });
  }

  // Verify integration belongs to user's organization
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    include: {
      location: {
        include: {
          restaurantGroup: true,
        },
      },
    },
  });

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  if (integration.location.restaurantGroup.organizationId !== auth.membership.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const locationId = integration.locationId;

  // Get last 12 months
  const now = new Date();
  const months: { label: string; startDate: Date; endDate: Date }[] = [];

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0); // Last day of month
    const label = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    months.push({ label, startDate: start, endDate: end });
  }

  // Query TransactionSummary for each month to get sync status
  const monthStatuses = await Promise.all(
    months.map(async (month) => {
      // Get all transaction summaries for this month
      const summaries = await prisma.transactionSummary.findMany({
        where: {
          locationId,
          date: {
            gte: month.startDate,
            lte: month.endDate,
          },
        },
        select: {
          date: true,
          netSales: true,
          transactionCount: true,
          syncedAt: true,
        },
      });

      if (summaries.length === 0) {
        return {
          label: month.label,
          startDate: month.startDate.toISOString(),
          endDate: month.endDate.toISOString(),
          status: "not_synced" as const,
          daysWithData: 0,
          netSales: 0,
          orderCount: 0,
          syncedAt: null,
        };
      }

      // Calculate totals
      const netSales = summaries.reduce((sum, s) => sum + Number(s.netSales ?? 0), 0);
      const orderCount = summaries.reduce((sum, s) => sum + (s.transactionCount ?? 0), 0);

      // Get most recent syncedAt
      const syncedAt = summaries
        .filter((s) => s.syncedAt)
        .sort((a, b) => new Date(b.syncedAt!).getTime() - new Date(a.syncedAt!).getTime())[0]?.syncedAt;

      return {
        label: month.label,
        startDate: month.startDate.toISOString(),
        endDate: month.endDate.toISOString(),
        status: "synced" as const,
        daysWithData: summaries.length,
        netSales,
        orderCount,
        syncedAt: syncedAt?.toISOString() ?? null,
      };
    })
  );

  return NextResponse.json({
    success: true,
    locationId,
    months: monthStatuses,
  });
}
