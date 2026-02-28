import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

const VALID_RESTAURANT_TYPES = [
  "fine_dining",
  "casual_dining",
  "fast_casual",
  "quick_service",
  "cafe",
  "bar_pub",
  "bistro",
  "ethnic_specialty",
  "food_truck",
  "buffet",
  "family_style",
  "ghost_kitchen",
] as const;

const requestSchema = z.object({
  restaurantType: z.enum(VALID_RESTAURANT_TYPES),
});

/**
 * PATCH /api/locations/[id]/restaurant-type
 *
 * Updates the restaurant type for a location.
 * Used during onboarding and in settings.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { id: locationId } = await params;

  try {
    const body = await request.json();
    const { restaurantType } = requestSchema.parse(body);

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update restaurant type
    const updated = await prisma.location.update({
      where: { id: locationId },
      data: { restaurantType },
    });

    return NextResponse.json({
      success: true,
      restaurantType: updated.restaurantType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid restaurant type", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Restaurant type update error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update restaurant type", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/locations/[id]/restaurant-type
 *
 * Gets the current restaurant type for a location.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { id: locationId } = await params;

  try {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      restaurantType: location.restaurantType,
    });
  } catch (error) {
    console.error("Restaurant type fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant type" },
      { status: 500 }
    );
  }
}
