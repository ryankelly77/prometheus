import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  restaurantGroupId: z.string(),
  neighborhood: z.string().nullable().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  timezone: z.string().default("America/Chicago"),
  conceptType: z.string().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/locations
 * List all locations for the organization
 */
export async function GET() {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  try {
    const locations = await prisma.location.findMany({
      where: {
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
      },
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locations
 * Create a new location
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const data = createLocationSchema.parse(body);

    // Verify the restaurant group belongs to the user's organization
    const restaurantGroup = await prisma.restaurantGroup.findFirst({
      where: {
        id: data.restaurantGroupId,
        organizationId: auth.organization.id,
      },
    });

    if (!restaurantGroup) {
      return NextResponse.json(
        { error: "Restaurant group not found" },
        { status: 404 }
      );
    }

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.location.updateMany({
        where: {
          restaurantGroupId: data.restaurantGroupId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const location = await prisma.location.create({
      data: {
        restaurantGroupId: data.restaurantGroupId,
        name: data.name,
        neighborhood: data.neighborhood,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        timezone: data.timezone,
        conceptType: data.conceptType,
        isDefault: data.isDefault ?? false,
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

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
