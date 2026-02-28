import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

const requestSchema = z.object({
  integrationId: z.string(),
  syncedMonths: z.number().min(0).max(12),
  step: z.number().min(1).max(10),
});

/**
 * POST /api/integrations/toast/onboarding-progress
 *
 * Updates the onboarding progress for a Toast integration.
 * Called during the sync process to track progress.
 */
export async function POST(request: NextRequest) {
  // Auth check
  const auth = await requireRole("VIEWER");
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const body = await request.json();
    const { integrationId, syncedMonths, step } = requestSchema.parse(body);

    // Verify integration belongs to user's organization
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        location: {
          include: {
            restaurantGroup: true,
          },
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (
      integration.location.restaurantGroup.organizationId !==
      auth.membership.organizationId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update onboarding progress
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        onboardingStep: step,
        onboardingSyncedMonths: syncedMonths,
        // Set startedAt if not already set
        onboardingStartedAt: integration.onboardingStartedAt ?? new Date(),
        // Mark completed if step is final
        ...(step >= 6 ? { onboardingCompletedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      step,
      syncedMonths,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Onboarding progress update error:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
