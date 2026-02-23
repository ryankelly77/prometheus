import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { sendInvitationEmail } from "@/lib/email";
import { addDays } from "date-fns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/invitations/[id]/resend
 * Resend an invitation email and optionally extend expiration.
 * Requires GROUP_ADMIN or higher.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole("GROUP_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const invitation = await prisma.invitation.findFirst({
      where: {
        id,
        organizationId: auth.organization.id,
      },
      include: {
        organization: {
          select: { name: true },
        },
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
        { error: "Cannot resend an accepted invitation" },
        { status: 400 }
      );
    }

    if (invitation.revokedAt) {
      return NextResponse.json(
        { error: "Cannot resend a revoked invitation" },
        { status: 400 }
      );
    }

    // Rate limiting: max 5 resends per invitation
    if (invitation.emailSentCount >= 5) {
      return NextResponse.json(
        { error: "Maximum resend limit reached for this invitation" },
        { status: 429 }
      );
    }

    // Extend expiration if expired or expiring soon (within 1 day)
    const oneDayFromNow = addDays(new Date(), 1);
    const needsExtension = invitation.expiresAt < oneDayFromNow;

    const updatedInvitation = await prisma.invitation.update({
      where: { id },
      data: {
        emailSentAt: new Date(),
        emailSentCount: { increment: 1 },
        ...(needsExtension && { expiresAt: addDays(new Date(), 7) }),
      },
    });

    // Send invitation email via Mailgun
    await sendInvitationEmail(
      invitation.email,
      invitation.token,
      invitation.invitedByEmail,
      invitation.organization.name,
      invitation.role,
      {
        name: invitation.organization.name,
        primaryColor: auth.organization.primaryColor,
        logoUrl: auth.organization.logoUrl,
      }
    );

    return NextResponse.json({
      success: true,
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        expiresAt: updatedInvitation.expiresAt,
        emailSentCount: updatedInvitation.emailSentCount,
      },
    });
  } catch (error) {
    console.error("Resend invitation error:", error);
    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
