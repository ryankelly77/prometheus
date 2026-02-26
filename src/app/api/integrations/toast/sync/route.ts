import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import {
  syncToastData,
  triggerIncrementalSync,
  triggerHistoricalSync,
} from "@/lib/integrations/toast/sync";
import { getSyncJobProgress } from "@/lib/integrations/sync-manager";

const syncSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  fullSync: z.boolean().optional(),
  dataTypes: z.array(z.enum(["orders", "labor", "menus"])).optional(),
});

/**
 * POST /api/integrations/toast/sync
 * Trigger Toast data sync
 */
export async function POST(request: NextRequest) {
  try {
    // Require GROUP_ADMIN or higher
    const auth = await requireRole("GROUP_ADMIN");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { integrationId, startDate, endDate, fullSync, dataTypes } =
      syncSchema.parse(body);

    // Get integration and verify ownership
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

    if (
      integration.location.restaurantGroup.organizationId !==
      auth.membership.organizationId
    ) {
      return NextResponse.json(
        { error: "Integration does not belong to your organization" },
        { status: 403 }
      );
    }

    if (integration.type !== "TOAST") {
      return NextResponse.json({ error: "Integration is not Toast" }, { status: 400 });
    }

    if (integration.status !== "CONNECTED") {
      return NextResponse.json(
        { error: "Toast integration is not connected" },
        { status: 400 }
      );
    }

    // Determine sync type and trigger
    let result;

    if (fullSync) {
      // Full 12-month historical sync
      result = await triggerHistoricalSync(integrationId);
    } else if (!startDate && !endDate) {
      // Default incremental sync (last day)
      result = await triggerIncrementalSync(integrationId);
    } else {
      // Custom date range sync
      result = await syncToastData(integrationId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        dataTypes: dataTypes as Array<"orders" | "labor" | "menus">,
      });
    }

    const progress = getSyncJobProgress(result.jobId);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: progress?.status ?? "pending",
      ordersProcessed: result.ordersProcessed,
      laborEntriesProcessed: result.laborEntriesProcessed,
      menuItemsProcessed: result.menuItemsProcessed,
      message: fullSync
        ? "Historical sync started (12 months). This may take several minutes."
        : "Sync started",
    });
  } catch (error) {
    console.error("Toast sync error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start sync" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/toast/sync?jobId=xxx
 * Get sync job progress
 */
export async function GET(request: NextRequest) {
  try {
    // Require viewer access
    const auth = await requireRole("VIEWER");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const progress = getSyncJobProgress(jobId);

    if (!progress) {
      return NextResponse.json({ error: "Sync job not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("Toast sync progress error:", error);

    return NextResponse.json(
      { error: "Failed to get sync progress" },
      { status: 500 }
    );
  }
}
