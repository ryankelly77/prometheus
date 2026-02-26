import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { createToastClient } from "@/lib/integrations/toast/client";
import { updateToastConfig, getToastConfig } from "@/lib/integrations/toast/auth";

const saveMappingsSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
  locationMappings: z.record(z.string(), z.string()),
});

/**
 * GET /api/integrations/toast/locations?integrationId=xxx
 * Get Toast restaurant info and Prometheus locations for mapping
 */
export async function GET(request: NextRequest) {
  try {
    // Require GROUP_ADMIN or higher
    const auth = await requireRole("GROUP_ADMIN");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get("integrationId");

    if (!integrationId) {
      return NextResponse.json(
        { error: "Integration ID is required" },
        { status: 400 }
      );
    }

    // Verify integration ownership
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        location: {
          include: {
            restaurantGroup: {
              include: {
                locations: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    name: true,
                    neighborhood: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
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

    // Get current config
    const config = await getToastConfig(integrationId);
    const currentMappings = config?.locationMappings ?? {};

    // Fetch Toast restaurant info
    let toastRestaurant: {
      guid: string;
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      timezone?: string;
    } | null = null;

    try {
      const client = createToastClient(integrationId);
      const restaurant = await client.fetchRestaurant();
      toastRestaurant = {
        guid: restaurant.guid,
        name: restaurant.general?.name,
        address: restaurant.location?.address1,
        city: restaurant.location?.city,
        state: restaurant.location?.state,
        timezone: restaurant.general?.timeZone,
      };
    } catch (fetchError) {
      console.error("Failed to fetch Toast restaurant:", fetchError);
      // Return what we have from config
      if (config?.restaurantGuid) {
        toastRestaurant = {
          guid: config.restaurantGuid,
          name: config.restaurantName,
          timezone: config.timezone,
        };
      }
    }

    // Get Prometheus locations from the same restaurant group
    const prometheusLocations = integration.location.restaurantGroup.locations;

    return NextResponse.json({
      success: true,
      toastRestaurant,
      prometheusLocations,
      currentMappings,
    });
  } catch (error) {
    console.error("Toast locations error:", error);

    return NextResponse.json(
      { error: "Failed to get Toast locations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/toast/locations
 * Save location mappings
 */
export async function POST(request: NextRequest) {
  try {
    // Require GROUP_ADMIN or higher
    const auth = await requireRole("GROUP_ADMIN");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { integrationId, locationMappings } = saveMappingsSchema.parse(body);

    // Verify integration ownership
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

    // Validate that Prometheus location IDs belong to the organization
    const prometheusLocationIds = Object.values(locationMappings);
    const validLocations = await prisma.location.findMany({
      where: {
        id: { in: prometheusLocationIds },
        restaurantGroup: {
          organizationId: auth.membership.organizationId,
        },
      },
      select: { id: true },
    });

    const validIds = new Set(validLocations.map((l) => l.id));
    for (const promId of prometheusLocationIds) {
      if (!validIds.has(promId)) {
        return NextResponse.json(
          { error: `Invalid Prometheus location ID: ${promId}` },
          { status: 400 }
        );
      }
    }

    // Save mappings
    await updateToastConfig(integrationId, { locationMappings });

    return NextResponse.json({
      success: true,
      message: `Saved ${Object.keys(locationMappings).length} location mappings`,
      mappedCount: Object.keys(locationMappings).length,
    });
  } catch (error) {
    console.error("Toast save mappings error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save location mappings" },
      { status: 500 }
    );
  }
}
