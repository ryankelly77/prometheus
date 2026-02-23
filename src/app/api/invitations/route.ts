import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { sendInvitationEmail } from "@/lib/email";
import { z } from "zod";
import { addDays } from "date-fns";

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "SUPER_ADMIN",
    "PARTNER_ADMIN",
    "GROUP_ADMIN",
    "LOCATION_MANAGER",
    "VIEWER",
  ]),
  restaurantGroupIds: z.array(z.string()).optional().default([]),
  locationIds: z.array(z.string()).optional().default([]),
  expiresInDays: z.number().min(1).max(30).optional().default(7),
});

/**
 * GET /api/invitations
 * List all invitations for the current organization.
 * Requires GROUP_ADMIN or higher.
 */
export async function GET() {
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: auth.organization.id,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        restaurantGroupIds: true,
        locationIds: true,
        expiresAt: true,
        acceptedAt: true,
        invitedByEmail: true,
        emailSentAt: true,
        emailSentCount: true,
        createdAt: true,
      },
    });

    // Add status field for convenience
    const invitationsWithStatus = invitations.map((inv) => ({
      ...inv,
      status: inv.acceptedAt
        ? "accepted"
        : inv.expiresAt < new Date()
          ? "expired"
          : "pending",
    }));

    return NextResponse.json({ invitations: invitationsWithStatus });
  } catch (error) {
    console.error("List invitations error:", error);
    return NextResponse.json(
      { error: "Failed to list invitations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations
 * Create a new invitation.
 * Requires GROUP_ADMIN or higher.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const data = createInvitationSchema.parse(body);

    // Check if user is trying to create an invite with higher role than their own
    const roleHierarchy = [
      "VIEWER",
      "LOCATION_MANAGER",
      "GROUP_ADMIN",
      "PARTNER_ADMIN",
      "SUPER_ADMIN",
    ];
    const userRoleIndex = roleHierarchy.indexOf(auth.membership.role);
    const inviteRoleIndex = roleHierarchy.indexOf(data.role);

    if (inviteRoleIndex > userRoleIndex) {
      return NextResponse.json(
        { error: "Cannot create invitation with higher role than your own" },
        { status: 403 }
      );
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.invitation.findUnique({
      where: {
        organizationId_email: {
          organizationId: auth.organization.id,
          email: data.email,
        },
      },
    });

    if (existingInvite && !existingInvite.acceptedAt && !existingInvite.revokedAt) {
      return NextResponse.json(
        { error: "An invitation for this email already exists" },
        { status: 409 }
      );
    }

    // Check if user already exists in organization
    const existingMembership = await prisma.userOrganization.findFirst({
      where: {
        organizationId: auth.organization.id,
        user: { email: data.email },
        isActive: true,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      );
    }

    // Create or update invitation
    const invitation = existingInvite
      ? await prisma.invitation.update({
          where: { id: existingInvite.id },
          data: {
            role: data.role,
            restaurantGroupIds: data.restaurantGroupIds,
            locationIds: data.locationIds,
            expiresAt: addDays(new Date(), data.expiresInDays),
            acceptedAt: null,
            revokedAt: null,
            invitedById: auth.user.id,
            invitedByEmail: auth.user.email,
            emailSentAt: null,
            emailSentCount: 0,
          },
        })
      : await prisma.invitation.create({
          data: {
            organizationId: auth.organization.id,
            email: data.email,
            role: data.role,
            restaurantGroupIds: data.restaurantGroupIds,
            locationIds: data.locationIds,
            expiresAt: addDays(new Date(), data.expiresInDays),
            invitedById: auth.user.id,
            invitedByEmail: auth.user.email,
          },
        });

    // Send invitation email via Mailgun
    await sendInvitationEmail(
      invitation.email,
      invitation.token,
      auth.user.fullName || auth.user.email,
      auth.organization.name,
      invitation.role,
      {
        name: auth.organization.name,
        primaryColor: auth.organization.primaryColor,
        logoUrl: auth.organization.logoUrl,
      }
    );

    // Update emailSentAt
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        emailSentAt: new Date(),
        emailSentCount: 1,
      },
    });

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          token: invitation.token, // Include token for manual sharing
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create invitation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}
