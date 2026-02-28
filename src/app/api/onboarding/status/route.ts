import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

/**
 * GET /api/onboarding/status
 *
 * Checks onboarding status for the current user's primary location.
 * Used by dashboard layout to redirect to onboarding if needed.
 */
export async function GET(request: NextRequest) {
  try {
    // Require viewer access
    const auth = await requireRole("VIEWER");
    if (auth instanceof NextResponse) return auth;

    // Get user's first location
    const location = await prisma.location.findFirst({
      where: {
        restaurantGroup: {
          organizationId: auth.membership.organizationId,
        },
      },
      include: {
        integrations: {
          where: {
            type: { in: ["TOAST", "SQUARE", "CLOVER", "REVEL"] },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!location) {
      // No location - they need to set up the account first
      return NextResponse.json({
        needsOnboarding: false,
        reason: "no_location",
      });
    }

    const posIntegration = location.integrations[0];

    // No POS integration at all - needs onboarding
    if (!posIntegration) {
      return NextResponse.json({
        needsOnboarding: true,
        reason: "no_pos_integration",
        locationId: location.id,
      });
    }

    // Has integration but not connected
    if (posIntegration.status !== "CONNECTED") {
      return NextResponse.json({
        needsOnboarding: true,
        reason: "pos_not_connected",
        locationId: location.id,
        integrationId: posIntegration.id,
      });
    }

    // Connected but onboarding not completed
    if (!posIntegration.onboardingCompletedAt) {
      // Check if they have any synced data
      const hasSyncedData = await prisma.transactionSummary.count({
        where: { locationId: location.id },
      });

      if (hasSyncedData === 0 || (posIntegration.onboardingSyncedMonths ?? 0) < 1) {
        return NextResponse.json({
          needsOnboarding: true,
          reason: "onboarding_in_progress",
          locationId: location.id,
          integrationId: posIntegration.id,
          step: posIntegration.onboardingStep ?? 2,
          syncedMonths: posIntegration.onboardingSyncedMonths ?? 0,
        });
      }

      // They have data but didn't complete the insights step - still redirect
      if ((posIntegration.onboardingStep ?? 0) < 3) {
        return NextResponse.json({
          needsOnboarding: true,
          reason: "needs_insights",
          locationId: location.id,
          integrationId: posIntegration.id,
          step: posIntegration.onboardingStep ?? 2,
          syncedMonths: posIntegration.onboardingSyncedMonths ?? 0,
        });
      }
    }

    // Onboarding complete
    return NextResponse.json({
      needsOnboarding: false,
      reason: "complete",
      locationId: location.id,
      integrationId: posIntegration.id,
    });
  } catch (error) {
    console.error("Onboarding status check error:", error);
    // On error, don't block - let them through
    return NextResponse.json({
      needsOnboarding: false,
      reason: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
