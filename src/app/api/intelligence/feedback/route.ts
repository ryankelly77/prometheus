import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

const VALID_RATINGS = ["helpful", "not_helpful", "incorrect"] as const;

const feedbackSchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  insightId: z.string().min(1, "Insight ID is required"),
  rating: z.enum(VALID_RATINGS),
  userComment: z.string().max(1000).optional(),
});

/**
 * POST /api/intelligence/feedback
 *
 * Records user feedback on an AI insight.
 * Returns suggested profile additions based on feedback patterns.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const data = feedbackSchema.parse(body);

    // Verify location belongs to user's organization
    const location = await prisma.location.findUnique({
      where: { id: data.locationId },
      include: {
        restaurantGroup: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify insight exists
    const insight = await prisma.aIInsight.findUnique({
      where: { id: data.insightId },
    });

    if (!insight) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    // Create feedback record
    const feedback = await prisma.insightFeedback.create({
      data: {
        locationId: data.locationId,
        insightId: data.insightId,
        rating: data.rating,
        userComment: data.userComment,
      },
    });

    // Update insight status based on feedback
    if (data.rating === "helpful") {
      // Pin the insight and extend expiration to 30 days
      await prisma.aIInsight.update({
        where: { id: data.insightId },
        data: {
          status: "pinned",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else if (data.rating === "not_helpful" || data.rating === "incorrect") {
      // Hide the insight immediately
      await prisma.aIInsight.update({
        where: { id: data.insightId },
        data: {
          status: "hidden",
        },
      });
    }

    // Generate profile suggestions based on feedback
    let suggestions: string[] = [];

    if (data.rating === "not_helpful" || data.rating === "incorrect") {
      // Get recent feedback to identify patterns
      const recentFeedback = await prisma.insightFeedback.findMany({
        where: {
          locationId: data.locationId,
          rating: { in: ["not_helpful", "incorrect"] },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        include: {
          insight: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // Check if we have multiple negative feedbacks
      if (recentFeedback.length >= 2) {
        // Get the restaurant profile
        const profile = await prisma.restaurantProfile.findUnique({
          where: { locationId: data.locationId },
        });

        const selectedDescriptors = profile?.selectedDescriptors || [];
        const selectedCount = selectedDescriptors.length;

        // Suggest adding more descriptors if profile is sparse
        if (selectedCount < 3) {
          suggestions.push(
            "Consider adding more descriptors to your restaurant profile to help us provide more accurate insights."
          );
        }

        // If user commented, we might be able to extract patterns
        if (data.userComment) {
          const comment = data.userComment.toLowerCase();

          // Check for common issues
          if (comment.includes("price") || comment.includes("cost") || comment.includes("expensive")) {
            suggestions.push(
              "If pricing assumptions are incorrect, update your price range in the restaurant profile."
            );
          }
          if (comment.includes("customer") || comment.includes("demographic") || comment.includes("audience")) {
            suggestions.push(
              "Consider updating your target demographic in the restaurant profile."
            );
          }
          if (comment.includes("concept") || comment.includes("style") || comment.includes("type")) {
            suggestions.push(
              "Your restaurant concept or style may need clarification in the profile settings."
            );
          }
          if (comment.includes("location") || comment.includes("neighborhood") || comment.includes("area")) {
            suggestions.push(
              "Add neighborhood details to your profile for more location-relevant insights."
            );
          }
        }

        // Check for pattern in insight types
        const insightTypes = recentFeedback
          .map((f) => f.insight.title?.toLowerCase() || "")
          .filter(Boolean);

        // Simple pattern detection (can be expanded)
        const hasRevenueIssues = insightTypes.some(
          (t) => t.includes("revenue") || t.includes("sales")
        );
        const hasLaborIssues = insightTypes.some(
          (t) => t.includes("labor") || t.includes("staff")
        );
        const hasCostIssues = insightTypes.some(
          (t) => t.includes("cost") || t.includes("expense")
        );

        if (hasRevenueIssues && !selectedDescriptors.some((d) => d.includes("revenue") || d.includes("sales"))) {
          suggestions.push(
            "Revenue-related insights may improve if you add more details about your sales focus and strategy."
          );
        }
        if (hasLaborIssues && !selectedDescriptors.some((d) => d.includes("staff") || d.includes("service"))) {
          suggestions.push(
            "Labor insights may be more accurate with details about your service style and staffing model."
          );
        }
        if (hasCostIssues && !selectedDescriptors.some((d) => d.includes("cost") || d.includes("premium"))) {
          suggestions.push(
            "Cost insights may benefit from more context about your ingredient sourcing and quality focus."
          );
        }
      }
    }

    // Return success with suggestions
    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        rating: feedback.rating,
        createdAt: feedback.createdAt,
      },
      suggestions: suggestions.length > 0 ? suggestions : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid feedback data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Insight feedback error:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/intelligence/feedback?locationId=xxx
 *
 * Returns feedback history for a location.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const insightId = searchParams.get("insightId");

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
      include: {
        restaurantGroup: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build query
    const where: { locationId: string; insightId?: string } = { locationId };
    if (insightId) {
      where.insightId = insightId;
    }

    // Get feedback records
    const feedback = await prisma.insightFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        insight: {
          select: {
            id: true,
            title: true,
            periodType: true,
          },
        },
      },
    });

    // Calculate summary statistics
    const stats = {
      total: feedback.length,
      helpful: feedback.filter((f) => f.rating === "helpful").length,
      notHelpful: feedback.filter((f) => f.rating === "not_helpful").length,
      incorrect: feedback.filter((f) => f.rating === "incorrect").length,
    };

    return NextResponse.json({
      feedback,
      stats,
    });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
