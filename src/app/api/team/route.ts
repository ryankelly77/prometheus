import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/team
 * List all team members (users) for the current organization.
 * Requires GROUP_ADMIN or higher.
 */
export async function GET() {
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const memberships = await prisma.userOrganization.findMany({
      where: {
        organizationId: auth.organization.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const members = memberships.map((m) => ({
      id: m.userId,
      email: m.user.email,
      fullName: m.user.fullName,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      isActive: m.isActive,
      joinedAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("List team members error:", error);
    return NextResponse.json(
      { error: "Failed to list team members" },
      { status: 500 }
    );
  }
}
