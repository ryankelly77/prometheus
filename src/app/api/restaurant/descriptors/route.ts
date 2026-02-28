import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import {
  getDescriptorsForType,
  descriptorsByType,
} from "@/lib/config/restaurant-descriptors";

const VALID_RESTAURANT_TYPES = [
  "fine_dining",
  "casual_dining",
  "fast_casual",
  "quick_service",
  "cafe",
  "bar_pub",
  "bistro",
  "ethnic_specialty",
  "food_truck",
  "buffet",
  "family_style",
  "ghost_kitchen",
] as const;

/**
 * GET /api/restaurant/descriptors?type=fine_dining
 *
 * Returns descriptor categories for a given restaurant type.
 * If no type is provided, returns all available types.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    // If no type specified, return the list of available types
    if (!type) {
      return NextResponse.json({
        types: VALID_RESTAURANT_TYPES,
        // Return a summary of available types
        summary: VALID_RESTAURANT_TYPES.map((t) => ({
          type: t,
          categoryCount: (descriptorsByType[t] || []).length,
        })),
      });
    }

    // Validate the type
    if (!VALID_RESTAURANT_TYPES.includes(type as (typeof VALID_RESTAURANT_TYPES)[number])) {
      return NextResponse.json(
        {
          error: "Invalid restaurant type",
          validTypes: VALID_RESTAURANT_TYPES,
        },
        { status: 400 }
      );
    }

    // Get descriptors for the specified type
    const categories = getDescriptorsForType(type);

    return NextResponse.json({
      type,
      categories,
    });
  } catch (error) {
    console.error("Descriptors fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch descriptors" },
      { status: 500 }
    );
  }
}
