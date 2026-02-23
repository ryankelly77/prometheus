import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";
import { addHours } from "date-fns";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password
 * Request a password reset email.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Find user by email
    const user = await prisma.userProfile.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        userOrganizations: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                name: true,
                logoUrl: true,
                primaryColor: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset email has been sent.",
      });
    }

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used to invalidate
      },
    });

    // Create new token (expires in 1 hour)
    const resetToken = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        expiresAt: addHours(new Date(), 1),
      },
    });

    // Get organization branding if available
    const branding = user.userOrganizations[0]?.organization || null;

    // Send email
    await sendPasswordResetEmail(user.email, resetToken.token, branding);

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset email has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
