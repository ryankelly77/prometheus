import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import prisma from "@/lib/prisma";
import { syncMonth, createSyncContext } from "@/lib/integrations/toast/sync-month";

interface BackfillProgress {
  phase: "initializing" | "month_start" | "fetching" | "processing" | "month_complete" | "backfill_complete" | "error";
  message: string;
  currentMonth: number;
  totalMonths: number;
  monthLabel?: string;
  percentComplete: number;
  // Per-month details
  ordersLoaded?: number;
  fetchingPage?: number;
  // Month completion data
  monthNetSales?: number;
  monthOrderCount?: number;
  monthDaysProcessed?: number;
  // Final summary
  summary?: {
    totalNetSales: number;
    totalOrderCount: number;
    totalDaysProcessed: number;
    monthsCompleted: number;
    durationMs: number;
  };
  error?: string;
}

/**
 * POST /api/integrations/toast/backfill
 * 12-month backfill with SSE streaming progress
 * Authenticates once and reuses token across all months
 */
export async function POST(request: NextRequest) {
  // Auth check
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof Response) {
    return auth;
  }

  const body = await request.json();
  const { integrationId } = body;

  if (!integrationId) {
    return new Response("Missing integrationId", { status: 400 });
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
    return new Response("Integration not found", { status: 404 });
  }

  if (integration.location.restaurantGroup.organizationId !== auth.membership.organizationId) {
    return new Response("Unauthorized", { status: 403 });
  }

  const locationId = integration.locationId;

  // Calculate 12 months: current month back to 11 months ago
  const months: { start: Date; end: Date; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0); // Last day of month

    // For current month, end is today
    const effectiveEnd = i === 0 ? now : end;

    const label = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    months.push({ start, end: effectiveEnd, label });
  }

  // Process in reverse order (oldest first) for more intuitive progress
  months.reverse();

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: BackfillProgress) => {
        const data = `data: ${JSON.stringify(progress)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const backfillStartTime = Date.now();
      let totalNetSales = 0;
      let totalOrderCount = 0;
      let totalDaysProcessed = 0;
      let monthsCompleted = 0;

      try {
        // Phase: Initializing - authenticate ONCE
        sendProgress({
          phase: "initializing",
          message: "Connecting to Toast API...",
          currentMonth: 0,
          totalMonths: 12,
          percentComplete: 2,
        });

        const { client, configMappings } = await createSyncContext(integrationId);

        console.log(`[Toast Backfill] Starting 12-month backfill for integration ${integrationId}`);
        console.log(`[Toast Backfill] Months to process:`, months.map(m => m.label).join(", "));

        // Process each month sequentially
        for (let i = 0; i < months.length; i++) {
          const month = months[i];
          const monthNumber = i + 1;

          // Calculate progress percentages
          // Reserve 5% for init, 90% for months (7.5% each), 5% for finalization
          const monthStartPercent = 5 + (i * 7.5);
          const monthEndPercent = 5 + ((i + 1) * 7.5);

          // Month start
          sendProgress({
            phase: "month_start",
            message: `Starting ${month.label}...`,
            currentMonth: monthNumber,
            totalMonths: 12,
            monthLabel: month.label,
            percentComplete: Math.round(monthStartPercent),
          });

          console.log(`[Toast Backfill] Processing month ${monthNumber}/12: ${month.label}`);

          // Sync this month with progress callbacks
          const result = await syncMonth(
            client,
            integrationId,
            locationId,
            month.start,
            month.end,
            configMappings,
            {
              onFetchingStart: () => {
                sendProgress({
                  phase: "fetching",
                  message: `Fetching orders for ${month.label}...`,
                  currentMonth: monthNumber,
                  totalMonths: 12,
                  monthLabel: month.label,
                  percentComplete: Math.round(monthStartPercent + 1),
                  fetchingPage: 0,
                  ordersLoaded: 0,
                });
              },
              onPageFetched: (page, ordersLoaded) => {
                // Fetching is ~40% of month processing
                const fetchProgress = Math.min(page * 0.5, 3); // Cap at 3%
                sendProgress({
                  phase: "fetching",
                  message: `Fetching ${month.label}... page ${page} (${ordersLoaded.toLocaleString()} orders)`,
                  currentMonth: monthNumber,
                  totalMonths: 12,
                  monthLabel: month.label,
                  percentComplete: Math.round(monthStartPercent + fetchProgress),
                  fetchingPage: page,
                  ordersLoaded,
                });
              },
              onProcessingStart: (orderCount) => {
                sendProgress({
                  phase: "processing",
                  message: `Processing ${orderCount.toLocaleString()} orders for ${month.label}...`,
                  currentMonth: monthNumber,
                  totalMonths: 12,
                  monthLabel: month.label,
                  percentComplete: Math.round(monthStartPercent + 4),
                  ordersLoaded: orderCount,
                });
              },
              onSavingStart: () => {
                sendProgress({
                  phase: "processing",
                  message: `Saving ${month.label} data...`,
                  currentMonth: monthNumber,
                  totalMonths: 12,
                  monthLabel: month.label,
                  percentComplete: Math.round(monthStartPercent + 6),
                });
              },
            }
          );

          if (!result.success) {
            throw new Error(`Failed to sync ${month.label}: ${result.error}`);
          }

          // Update totals
          totalNetSales += result.netSales;
          totalOrderCount += result.orderCount;
          totalDaysProcessed += result.daysProcessed;
          monthsCompleted++;

          // Month complete
          sendProgress({
            phase: "month_complete",
            message: `Completed ${month.label}`,
            currentMonth: monthNumber,
            totalMonths: 12,
            monthLabel: month.label,
            percentComplete: Math.round(monthEndPercent),
            monthNetSales: result.netSales,
            monthOrderCount: result.orderCount,
            monthDaysProcessed: result.daysProcessed,
          });

          console.log(`[Toast Backfill] Completed ${month.label}: ${result.orderCount} orders, $${result.netSales.toFixed(2)} net sales, ${result.daysProcessed} days`);
        }

        // Update integration status
        await prisma.integration.update({
          where: { id: integrationId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: "SUCCESS",
            lastSyncError: null,
          },
        });

        const durationMs = Date.now() - backfillStartTime;

        // Backfill complete
        sendProgress({
          phase: "backfill_complete",
          message: "12-month backfill complete!",
          currentMonth: 12,
          totalMonths: 12,
          percentComplete: 100,
          summary: {
            totalNetSales,
            totalOrderCount,
            totalDaysProcessed,
            monthsCompleted,
            durationMs,
          },
        });

        console.log(`[Toast Backfill] Complete! Total: ${totalOrderCount} orders, $${totalNetSales.toFixed(2)} net sales, ${totalDaysProcessed} days in ${Math.round(durationMs / 1000)}s`);

        controller.close();
      } catch (error) {
        console.error("[Toast Backfill] Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

        // Update integration with error
        await prisma.integration.update({
          where: { id: integrationId },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: "FAILED",
            lastSyncError: errorMessage,
          },
        });

        sendProgress({
          phase: "error",
          message: "Backfill failed",
          currentMonth: monthsCompleted,
          totalMonths: 12,
          percentComplete: 0,
          error: errorMessage,
        });

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
