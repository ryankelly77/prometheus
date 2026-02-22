import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invitations/[id]
 * Get a single invitation by ID.
 * Requires GROUP_ADMIN or higher.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const invitation = await prisma.invitation.findFirst({
      where: {
        id,
        organizationId: auth.organization.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        restaurantGroupIds: true,
        locationIds: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        invitedByEmail: true,
        emailSentAt: true,
        emailSentCount: true,
        createdAt: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const status = invitation.acceptedAt
      ? "accepted"
      : invitation.revokedAt
        ? "revoked"
        : invitation.expiresAt < new Date()
          ? "expired"
          : "pending";

    return NextResponse.json({ invitation: { ...invitation, status } });
  } catch (error) {
    console.error("Get invitation error:", error);
    return NextResponse.json(
      { error: "Failed to get invitation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invitations/[id]
 * Revoke an invitation.
 * Requires GROUP_ADMIN or higher.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const invitation = await prisma.invitation.findFirst({
      where: {
        id,
        organizationId: auth.organization.id,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "Cannot revoke an accepted invitation" },
        { status: 400 }
      );
    }

    if (invitation.revokedAt) {
      return NextResponse.json(
        { error: "Invitation is already revoked" },
        { status: 400 }
      );
    }

    await prisma.invitation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke invitation error:", error);
    return NextResponse.json(
      { error: "Failed to revoke invitation" },
      { status: 500 }
    );
  }
}
