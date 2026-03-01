import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

const updateLocationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  neighborhood: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  timezone: z.string().optional(),
  conceptType: z.string().nullable().optional(),
  restaurantType: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/locations/[id]
 * Get a specific location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const location = await prisma.location.findFirst({
      where: {
        id,
        restaurantGroup: {
          organizationId: auth.organization.id,
        },
      },
      include: {
        restaurantGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        integrations: {
          select: {
            id: true,
            type: true,
            status: true,
            lastSyncAt: true,
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ location });
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/locations/[id]
 * Update a location
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // Verify location belongs to user's organization
    const existingLocation = await prisma.location.findFirst({
      where: {
        id,
        restaurantGroup: {
          organizationId: auth.organization.id,
        },
      },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateLocationSchema.parse(body);

    // If setting as default, unset other defaults in the same group
    if (data.isDefault === true) {
      await prisma.location.updateMany({
        where: {
          restaurantGroupId: existingLocation.restaurantGroupId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.neighborhood !== undefined && { neighborhood: data.neighborhood }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.zipCode !== undefined && { zipCode: data.zipCode }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.conceptType !== undefined && { conceptType: data.conceptType }),
        ...(data.restaurantType !== undefined && { restaurantType: data.restaurantType }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
      include: {
        restaurantGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error("Error updating location:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[id]
 * Delete a location (soft delete by setting isActive = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("PARTNER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // Verify location belongs to user's organization
    const existingLocation = await prisma.location.findFirst({
      where: {
        id,
        restaurantGroup: {
          organizationId: auth.organization.id,
        },
      },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive = false
    await prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
