import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { getToastSyncStatus } from "@/lib/integrations/toast/sync";
import type { ToastIntegrationConfig } from "@/lib/integrations/toast/types";

/**
 * GET /api/integrations/toast/status?locationId=xxx
 * Get Toast integration status for a location
 */
export async function GET(request: NextRequest) {
  try {
    // Require viewer access
    const auth = await requireRole("VIEWER");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Location does not belong to your organization" },
        { status: 403 }
      );
    }

    // Get Toast integration for this location
    const integration = await prisma.integration.findUnique({
      where: {
        locationId_type: {
          locationId,
          type: "TOAST",
        },
      },
    });

    if (!integration) {
      return NextResponse.json({
        success: true,
        isConnected: false,
        status: "NOT_CONNECTED",
      });
    }

    // Get detailed status
    const syncStatus = await getToastSyncStatus(integration.id);
    const config = (integration.config as unknown as ToastIntegrationConfig) ?? {};

    return NextResponse.json({
      success: true,
      integrationId: integration.id,
      isConnected: integration.status === "CONNECTED",
      status: integration.status,
      restaurantGuid: config.restaurantGuid,
      restaurantName: config.restaurantName,
      timezone: config.timezone,
      lastSyncAt: integration.lastSyncAt,
      lastSyncStatus: integration.lastSyncStatus,
      lastSyncError: integration.lastSyncError,
      lastFullSync: config.lastFullSync,
      mappedLocations: syncStatus.mappedLocations,
      connectedAt: integration.connectedAt,
    });
  } catch (error) {
    console.error("Toast status error:", error);

    return NextResponse.json(
      { error: "Failed to get Toast status" },
      { status: 500 }
    );
  }
}
