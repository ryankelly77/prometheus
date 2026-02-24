import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { createR365Client } from "@/lib/integrations/r365/client";
import { updateR365Config, getR365Config } from "@/lib/integrations/r365/auth";

const saveMappingsSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
  locationMappings: z.record(z.string(), z.string()),
});

/**
 * GET /api/integrations/r365/locations?integrationId=xxx
 * Get available R365 locations for mapping
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
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json(
        { error: "Integration does not belong to your organization" },
        { status: 403 }
      );
    }

    if (integration.type !== "R365") {
      return NextResponse.json(
        { error: "Integration is not R365" },
        { status: 400 }
      );
    }

    // Get current config
    const config = await getR365Config(integrationId);
    const currentMappings = config?.locationMappings ?? {};

    // Fetch R365 locations
    let r365Locations: Array<{
      id: string;
      name: string;
      code?: string;
      address?: string;
      city?: string;
      state?: string;
    }> = [];

    try {
      const client = createR365Client(integrationId);
      const locations = await client.fetchLocations();
      r365Locations = locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        code: loc.code,
        address: loc.address,
        city: loc.city,
        state: loc.state,
      }));
    } catch (fetchError) {
      console.error("Failed to fetch R365 locations:", fetchError);
      // Return empty list but don't fail
    }

    // Get Prometheus locations from the same restaurant group
    const prometheusLocations = integration.location.restaurantGroup.locations;

    return NextResponse.json({
      success: true,
      r365Locations,
      prometheusLocations,
      currentMappings,
    });
  } catch (error) {
    console.error("R365 locations error:", error);

    return NextResponse.json(
      { error: "Failed to get R365 locations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/r365/locations
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
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json(
        { error: "Integration does not belong to your organization" },
        { status: 403 }
      );
    }

    if (integration.type !== "R365") {
      return NextResponse.json(
        { error: "Integration is not R365" },
        { status: 400 }
      );
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
    await updateR365Config(integrationId, { locationMappings });

    return NextResponse.json({
      success: true,
      message: `Saved ${Object.keys(locationMappings).length} location mappings`,
      mappedCount: Object.keys(locationMappings).length,
    });
  } catch (error) {
    console.error("R365 save mappings error:", error);

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
