import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const acceptInviteSchema = z.object({
  token: z.string(),
  fullName: z.string().min(2),
  userId: z.string().optional(),
});

/**
 * POST /api/auth/accept-invite
 * Accepts an invitation and creates user profile + organization membership.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, fullName, userId } = acceptInviteSchema.parse(body);

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Validate invitation state
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 400 }
      );
    }

    if (invitation.revokedAt) {
      return NextResponse.json(
        { error: "Invitation has been revoked" },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Get or create user profile
    // First check if user already exists (by email)
    let userProfile = await prisma.userProfile.findUnique({
      where: { email: invitation.email },
    });

    if (!userProfile && userId) {
      // Create new user profile
      userProfile = await prisma.userProfile.create({
        data: {
          id: userId, // Use Supabase auth user ID
          email: invitation.email,
          fullName,
        },
      });
    } else if (userProfile && fullName && !userProfile.fullName) {
      // Update existing profile with name if missing
      userProfile = await prisma.userProfile.update({
        where: { id: userProfile.id },
        data: { fullName },
      });
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile could not be created. Please try again." },
        { status: 500 }
      );
    }

    // Check if user already has membership in this org
    const existingMembership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: userProfile.id,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (existingMembership) {
      // Update existing membership if needed
      await prisma.userOrganization.update({
        where: { id: existingMembership.id },
        data: {
          role: invitation.role,
          restaurantGroupIds: invitation.restaurantGroupIds,
          locationIds: invitation.locationIds,
          isActive: true,
        },
      });
    } else {
      // Create new organization membership
      await prisma.userOrganization.create({
        data: {
          userId: userProfile.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
          restaurantGroupIds: invitation.restaurantGroupIds,
          locationIds: invitation.locationIds,
        },
      });
    }

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
    });
  } catch (error) {
    console.error("Accept invite error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
