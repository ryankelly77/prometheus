import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import type { ToastIntegrationConfig } from "@/lib/integrations/toast/types";

/**
 * GET /api/onboarding/status
 *
 * Checks onboarding status for the current user's primary location.
 * Used by dashboard layout to redirect to onboarding if needed.
 *
 * For existing restaurants with data, returns completed steps so the
 * onboarding wizard can start them at the insights reveal step.
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
      console.log("[Onboarding Status] No location found");
      return NextResponse.json({
        needsOnboarding: false,
        reason: "no_location",
      });
    }

    console.log("[Onboarding Status] Location:", location.id, location.name);
    console.log("[Onboarding Status] Integrations found:", location.integrations.length);
    location.integrations.forEach((i, idx) => {
      console.log(`[Onboarding Status] Integration ${idx}:`, i.type, i.status, i.id);
    });

    const posIntegration = location.integrations[0];

    // No POS integration at all - needs full onboarding
    if (!posIntegration) {
      console.log("[Onboarding Status] No POS integration found");
      return NextResponse.json({
        needsOnboarding: true,
        reason: "no_pos_integration",
        locationId: location.id,
        currentStep: "connect-pos",
        completedSteps: [],
      });
    }

    // Has integration but not connected - needs full onboarding
    if (posIntegration.status !== "CONNECTED") {
      console.log("[Onboarding Status] Integration not connected, status:", posIntegration.status);
      return NextResponse.json({
        needsOnboarding: true,
        reason: "pos_not_connected",
        locationId: location.id,
        integrationId: posIntegration.id,
        currentStep: "connect-pos",
        completedSteps: [],
      });
    }

    // Onboarding fully completed - let them through
    if (posIntegration.onboardingCompletedAt) {
      return NextResponse.json({
        needsOnboarding: false,
        reason: "complete",
        locationId: location.id,
        integrationId: posIntegration.id,
      });
    }

    // Get synced data summary
    const syncedData = await prisma.transactionSummary.groupBy({
      by: ["locationId"],
      where: { locationId: location.id },
      _count: { id: true },
      _sum: { netSales: true },
    });

    const hasSyncedData = syncedData.length > 0 && (syncedData[0]._count.id ?? 0) > 0;
    const totalRevenue = Number(syncedData[0]?._sum.netSales ?? 0);

    console.log("[Onboarding Status] Synced data check:", {
      hasSyncedData,
      totalRevenue,
      recordCount: syncedData[0]?._count.id ?? 0,
    });

    // Get unique months count
    const monthsData = await prisma.transactionSummary.findMany({
      where: { locationId: location.id },
      select: { date: true },
      distinct: ["date"],
    });

    // Count unique year-months
    const uniqueMonths = new Set(
      monthsData.map((d) => {
        const date = new Date(d.date);
        return `${date.getFullYear()}-${date.getMonth()}`;
      })
    );
    const syncedMonthsCount = uniqueMonths.size;

    // Get integration config for restaurant name
    const config = (posIntegration.config as unknown as ToastIntegrationConfig) ?? {};
    const restaurantName = config.restaurantName ?? location.name;

    // Existing restaurant with Toast connected AND synced data
    // Jump them to insights step
    if (hasSyncedData) {
      return NextResponse.json({
        needsOnboarding: true,
        reason: "needs_insights",
        locationId: location.id,
        integrationId: posIntegration.id,
        currentStep: "reveal-pos-insights",
        completedSteps: ["connect-pos", "syncing-pos"],
        // Include summary data for display
        posConnected: true,
        posName: "Toast",
        restaurantName,
        syncedMonths: syncedMonthsCount,
        totalRevenue,
        daysWithData: syncedData[0]?._count.id ?? 0,
      });
    }

    // Connected but no data yet - start at syncing step
    return NextResponse.json({
      needsOnboarding: true,
      reason: "onboarding_in_progress",
      locationId: location.id,
      integrationId: posIntegration.id,
      currentStep: posIntegration.onboardingStep === 2 ? "syncing-pos" : "syncing-pos",
      completedSteps: ["connect-pos"],
      posConnected: true,
      posName: "Toast",
      restaurantName,
      syncedMonths: posIntegration.onboardingSyncedMonths ?? 0,
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
