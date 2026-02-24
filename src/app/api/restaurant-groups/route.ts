import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/restaurant-groups
 * List all restaurant groups for the organization
 */
export async function GET() {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  try {
    const groups = await prisma.restaurantGroup.findMany({
      where: {
        organizationId: auth.organization.id,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            locations: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        locationCount: g._count.locations,
      })),
    });
  } catch (error) {
    console.error("Error fetching restaurant groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant groups" },
      { status: 500 }
    );
  }
}
