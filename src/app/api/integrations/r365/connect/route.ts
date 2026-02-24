import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import {
  verifyR365Credentials,
  storeR365Credentials,
} from "@/lib/integrations/r365/auth";
import { createR365Client } from "@/lib/integrations/r365/client";

const connectSchema = z.object({
  customerUrl: z.string().min(1, "Customer URL is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  locationId: z.string().min(1, "Location ID is required"),
});

/**
 * POST /api/integrations/r365/connect
 * Connect R365 integration with credentials
 */
export async function POST(request: NextRequest) {
  try {
    // Require GROUP_ADMIN or higher
    const auth = await requireRole("GROUP_ADMIN");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { customerUrl, username, password, locationId } = connectSchema.parse(body);

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
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    if (location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json(
        { error: "Location does not belong to your organization" },
        { status: 403 }
      );
    }

    // Verify credentials with R365
    const verification = await verifyR365Credentials({
      customerUrl,
      username,
      password,
    });

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error ?? "Invalid R365 credentials" },
        { status: 400 }
      );
    }

    // Create or update integration record
    const integration = await prisma.integration.upsert({
      where: {
        locationId_type: {
          locationId,
          type: "R365",
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
        type: "R365",
        status: "PENDING",
        connectedById: auth.user.id,
        connectedAt: new Date(),
        config: {
          customerUrl,
          locationMappings: {},
        },
      },
    });

    // Store encrypted credentials
    await storeR365Credentials(integration.id, {
      customerUrl,
      username,
      password,
    });

    // Update status to connected
    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: "CONNECTED" },
    });

    // Fetch R365 locations for mapping
    try {
      const client = createR365Client(integration.id);
      const r365Locations = await client.fetchLocations();

      return NextResponse.json({
        success: true,
        integrationId: integration.id,
        r365Locations: r365Locations.map((loc) => ({
          id: loc.id,
          name: loc.name,
          code: loc.code,
          address: loc.address,
          city: loc.city,
          state: loc.state,
        })),
        message: "Connected to R365. Please map your locations.",
      });
    } catch (fetchError) {
      // Connection worked but couldn't fetch locations
      return NextResponse.json({
        success: true,
        integrationId: integration.id,
        r365Locations: [],
        message: "Connected to R365. Location fetch failed - please try refreshing.",
        warning: fetchError instanceof Error ? fetchError.message : "Could not fetch R365 locations",
      });
    }
  } catch (error) {
    console.error("R365 connect error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to connect R365" },
      { status: 500 }
    );
  }
}
