import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import {
  verifyToastCredentials,
  storeToastCredentials,
} from "@/lib/integrations/toast/auth";
import { createToastClient } from "@/lib/integrations/toast/client";

const connectSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  restaurantGuid: z.string().min(1, "Restaurant GUID is required"),
  locationId: z.string().min(1, "Location ID is required"),
});

/**
 * POST /api/integrations/toast/connect
 * Connect Toast integration with credentials
 */
export async function POST(request: NextRequest) {
  try {
    // Require GROUP_ADMIN or higher
    const auth = await requireRole("GROUP_ADMIN");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { clientId, clientSecret, restaurantGuid, locationId } =
      connectSchema.parse(body);

    // Verify location belongs to user's organization
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        restaurantGroup: {
          include: { organization: true },
        },
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

    // Verify credentials with Toast
    const verification = await verifyToastCredentials({
      clientId,
      clientSecret,
      restaurantGuid,
    });

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error ?? "Invalid Toast credentials" },
        { status: 400 }
      );
    }

    // Create or update integration record
    const integration = await prisma.integration.upsert({
      where: {
        locationId_type: {
          locationId,
          type: "TOAST",
        },
      },
      update: {
        status: "CONNECTED",
        connectedAt: new Date(),
        connectedById: auth.user.id,
        lastSyncError: null,
      },
      create: {
        locationId,
        type: "TOAST",
        status: "PENDING",
        connectedById: auth.user.id,
        connectedAt: new Date(),
        config: {
          restaurantGuid,
          restaurantName: verification.restaurantName,
          locationMappings: {},
        },
      },
    });

    // Store encrypted credentials
    await storeToastCredentials(integration.id, {
      clientId,
      clientSecret,
      restaurantGuid,
    });

    // Update status to connected
    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: "CONNECTED" },
    });

    // Fetch Toast restaurant info and configuration mappings
    try {
      console.log(`[Toast Connect] Creating client for integration ${integration.id}`);
      const client = createToastClient(integration.id);

      // Fetch restaurant info and configuration in parallel
      console.log(`[Toast Connect] Fetching restaurant info and config mappings...`);
      const [restaurant, configMappings] = await Promise.all([
        client.fetchRestaurant(),
        client.fetchConfigurationMappings(),
      ]);

      // Log configuration for debugging
      console.log(`[Toast Connect] Fetched config for ${integration.id}:`);
      console.log(`  - Sales Categories: ${Object.keys(configMappings.salesCategories).length}`);
      console.log(`  - Restaurant Services: ${Object.keys(configMappings.restaurantServices).length}`);
      console.log(`  - Revenue Centers: ${Object.keys(configMappings.revenueCenters).length}`);
      console.log(`  - Sales Categories data:`, configMappings.salesCategories);
      console.log(`  - Restaurant Services data:`, configMappings.restaurantServices);

      // Build config object
      const configToStore = {
        restaurantGuid,
        restaurantName: restaurant.general?.name,
        timezone: restaurant.general?.timeZone,
        locationMappings: {},
        salesCategories: configMappings.salesCategories,
        restaurantServices: configMappings.restaurantServices,
        revenueCenters: configMappings.revenueCenters,
      };
      console.log(`[Toast Connect] Storing config:`, JSON.stringify(configToStore, null, 2));

      // Store configuration mappings
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          config: configToStore,
        },
      });
      console.log(`[Toast Connect] Config stored successfully`);

      return NextResponse.json({
        success: true,
        integrationId: integration.id,
        restaurant: {
          guid: restaurant.guid,
          name: restaurant.general?.name,
          address: restaurant.location?.address1,
          city: restaurant.location?.city,
          state: restaurant.location?.state,
          timezone: restaurant.general?.timeZone,
        },
        configLoaded: {
          salesCategories: Object.keys(configMappings.salesCategories).length,
          restaurantServices: Object.keys(configMappings.restaurantServices).length,
          revenueCenters: Object.keys(configMappings.revenueCenters).length,
        },
        message: "Connected to Toast. Configuration loaded successfully.",
      });
    } catch (fetchError) {
      // Connection worked but couldn't fetch restaurant details
      console.error("[Toast Connect] Failed to fetch config:", fetchError);
      return NextResponse.json({
        success: true,
        integrationId: integration.id,
        message: "Connected to Toast. Configuration fetch failed - sync may have limited category data.",
        warning:
          fetchError instanceof Error
            ? fetchError.message
            : "Could not fetch configuration details",
      });
    }
  } catch (error) {
    console.error("Toast connect error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to connect Toast" }, { status: 500 });
  }
}
