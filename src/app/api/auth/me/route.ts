import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/auth/me
 * Get current authenticated user with organization membership.
 */
export async function GET() {
  try {
    const supabaseUser = await getUser();

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with memberships
    const userProfile = await prisma.userProfile.findUnique({
      where: { id: supabaseUser.id },
      include: {
        userOrganizations: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Determine current organization
    const cookieStore = await cookies();
    const orgId = cookieStore.get("org_id")?.value;

    let currentMembership = userProfile.userOrganizations[0];

    if (orgId) {
      const matchingMembership = userProfile.userOrganizations.find(
        (m) => m.organizationId === orgId
      );
      if (matchingMembership) {
        currentMembership = matchingMembership;
      }
    }

    if (!currentMembership) {
      return NextResponse.json(
        { error: "No organization membership" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: userProfile.id,
        email: userProfile.email,
        fullName: userProfile.fullName,
        avatarUrl: userProfile.avatarUrl,
        membership: {
          id: currentMembership.id,
          role: currentMembership.role,
          organizationId: currentMembership.organizationId,
          organizationName: currentMembership.organization.name,
          organizationSlug: currentMembership.organization.slug,
          restaurantGroupIds: currentMembership.restaurantGroupIds,
          locationIds: currentMembership.locationIds,
        },
        organizations: userProfile.userOrganizations.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
        })),
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
