import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import {
  calculateConfidence,
  getConfidenceBadge,
  formatConfidenceBar,
} from "@/lib/intelligence/confidence";

/**
 * GET /api/intelligence/confidence?locationId=xxx
 *
 * Returns the intelligence confidence score for a location,
 * indicating how complete the data picture is.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json(
      { error: "locationId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Verify location belongs to user's organization
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: { restaurantGroup: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Calculate confidence
    const confidence = await calculateConfidence(locationId);
    const badge = getConfidenceBadge(confidence.score);
    const progressBar = formatConfidenceBar(confidence.score);

    return NextResponse.json({
      locationId,
      locationName: location.name,
      confidence: {
        ...confidence,
        badge,
        progressBar,
      },
    });
  } catch (error) {
    console.error("[Intelligence Confidence] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to calculate confidence", details: errorMessage },
      { status: 500 }
    );
  }
}
