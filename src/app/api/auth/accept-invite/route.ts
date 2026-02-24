import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const acceptInviteSchema = z.object({
  token: z.string(),
  fullName: z.string().min(2),
  password: z.string().min(8),
});

/**
 * POST /api/auth/accept-invite
 * Accepts an invitation and creates user profile + organization membership.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, fullName, password } = acceptInviteSchema.parse(body);

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

    // Create Supabase auth user via admin API (auto-confirmed)
    const supabaseAdmin = createAdminClient();

    // Check if user already exists in Supabase Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(
      (u) => u.email === invitation.email
    );

    let authUserId: string;

    if (existingAuthUser) {
      // User exists - update their password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        { password }
      );
      if (updateError) {
        console.error("Error updating user password:", updateError);
        return NextResponse.json(
          { error: "Failed to update user. Please try signing in with your existing password." },
          { status: 400 }
        );
      }
      authUserId = existingAuthUser.id;
    } else {
      // Create new user (auto-confirmed via admin API)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createError || !newUser.user) {
        console.error("Error creating user:", createError);
        return NextResponse.json(
          { error: createError?.message || "Failed to create user account" },
          { status: 500 }
        );
      }
      authUserId = newUser.user.id;
    }

    // Get or create user profile in our database
    // First check if profile exists with matching auth ID
    let userProfile = await prisma.userProfile.findUnique({
      where: { id: authUserId },
    });

    if (!userProfile) {
      // Check if profile exists by email (legacy case)
      const existingByEmail = await prisma.userProfile.findUnique({
        where: { email: invitation.email },
      });

      if (existingByEmail) {
        // Profile exists but with different ID - migrate it
        // Delete old profile and recreate with correct ID
        await prisma.$transaction(async (tx) => {
          // Get existing memberships
          const memberships = await tx.userOrganization.findMany({
            where: { userId: existingByEmail.id },
          });

          // Delete old memberships
          await tx.userOrganization.deleteMany({
            where: { userId: existingByEmail.id },
          });

          // Delete old profile
          await tx.userProfile.delete({
            where: { id: existingByEmail.id },
          });

          // Create new profile with correct ID
          await tx.userProfile.create({
            data: {
              id: authUserId,
              email: invitation.email,
              fullName: fullName || existingByEmail.fullName,
              avatarUrl: existingByEmail.avatarUrl,
            },
          });

          // Recreate memberships with new user ID
          for (const m of memberships) {
            await tx.userOrganization.create({
              data: {
                userId: authUserId,
                organizationId: m.organizationId,
                role: m.role,
                restaurantGroupIds: m.restaurantGroupIds,
                locationIds: m.locationIds,
                isActive: m.isActive,
              },
            });
          }
        });

        userProfile = await prisma.userProfile.findUnique({
          where: { id: authUserId },
        });
      } else {
        // Create new user profile
        userProfile = await prisma.userProfile.create({
          data: {
            id: authUserId,
            email: invitation.email,
            fullName,
          },
        });
      }
    } else if (fullName && !userProfile.fullName) {
      // Update existing profile with name if missing
      userProfile = await prisma.userProfile.update({
        where: { id: userProfile.id },
        data: { fullName },
      });
    }

    // Ensure we have a valid user profile
    if (!userProfile) {
      console.error("Failed to create or find user profile for:", invitation.email);
      return NextResponse.json(
        { error: "Failed to create user profile" },
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
