import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { createToastClient } from "@/lib/integrations/toast/client";
import { getToastConfig } from "@/lib/integrations/toast/auth";

const refreshSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
});

/**
 * POST /api/integrations/toast/refresh-config
 * Manually refresh Toast configuration mappings (salesCategories, restaurantServices, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Require GROUP_ADMIN or higher
    const auth = await requireRole("GROUP_ADMIN");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { integrationId } = refreshSchema.parse(body);

    // Verify integration exists and belongs to user's organization
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
      return NextResponse.json(
        { error: "Integration does not belong to your organization" },
        { status: 403 }
      );
    }

    if (integration.type !== "TOAST") {
      return NextResponse.json(
        { error: "Integration is not a Toast integration" },
        { status: 400 }
      );
    }

    // Get existing config
    const existingConfig = await getToastConfig(integrationId);
    if (!existingConfig?.restaurantGuid) {
      return NextResponse.json(
        { error: "Toast integration not properly configured" },
        { status: 400 }
      );
    }

    console.log(`[Toast Refresh Config] Starting config refresh for integration ${integrationId}`);

    // Fetch configuration mappings from Toast
    const client = createToastClient(integrationId);
    const configMappings = await client.fetchConfigurationMappings();

    console.log(`[Toast Refresh Config] Fetched config mappings:`, {
      salesCategories: Object.keys(configMappings.salesCategories).length,
      restaurantServices: Object.keys(configMappings.restaurantServices).length,
      revenueCenters: Object.keys(configMappings.revenueCenters).length,
    });

    // Log actual values for debugging
    console.log(`[Toast Refresh Config] Sales Categories:`, configMappings.salesCategories);
    console.log(`[Toast Refresh Config] Restaurant Services:`, configMappings.restaurantServices);
    console.log(`[Toast Refresh Config] Revenue Centers:`, configMappings.revenueCenters);

    // Merge with existing config (using plain object to satisfy Prisma JSON type)
    const updatedConfig = {
      ...existingConfig,
      salesCategories: configMappings.salesCategories,
      restaurantServices: configMappings.restaurantServices,
      revenueCenters: configMappings.revenueCenters,
    };

    // Update integration config
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        config: updatedConfig,
      },
    });

    console.log(`[Toast Refresh Config] Config saved successfully for integration ${integrationId}`);

    return NextResponse.json({
      success: true,
      integrationId,
      configLoaded: {
        salesCategories: Object.keys(configMappings.salesCategories).length,
        restaurantServices: Object.keys(configMappings.restaurantServices).length,
        revenueCenters: Object.keys(configMappings.revenueCenters).length,
      },
      // Include actual mappings for debugging
      mappings: {
        salesCategories: configMappings.salesCategories,
        restaurantServices: configMappings.restaurantServices,
        revenueCenters: configMappings.revenueCenters,
      },
      message: "Configuration refreshed successfully",
    });
  } catch (error) {
    console.error("[Toast Refresh Config] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh config" },
      { status: 500 }
    );
  }
}
