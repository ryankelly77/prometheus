import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { descriptorIdsToContexts } from "@/lib/config/restaurant-descriptors";

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

const VALID_PRICE_RANGES = ["$", "$$", "$$$", "$$$$"] as const;

const profileSchema = z.object({
  locationId: z.string().min(1, "Location ID is required"),
  restaurantType: z.enum(VALID_RESTAURANT_TYPES).optional(),
  conceptDescription: z.string().max(500).optional(),
  cuisineType: z.string().max(100).optional(),
  priceRange: z.enum(VALID_PRICE_RANGES).optional(),
  seatingCapacity: z.number().min(1).max(10000).optional(),
  neighborhood: z.string().max(200).optional(),
  targetDemographic: z.string().max(500).optional(),
  selectedDescriptors: z.array(z.string()).optional(),
});

/**
 * GET /api/restaurant/profile?locationId=xxx
 *
 * Returns the restaurant profile for a location.
 * Creates an empty profile if one doesn't exist.
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

    // Get or create profile
    let profile = await prisma.restaurantProfile.findUnique({
      where: { locationId },
    });

    if (!profile) {
      // Return empty profile structure (don't auto-create yet)
      return NextResponse.json({
        profile: {
          locationId,
          restaurantType: location.restaurantType,
          conceptDescription: null,
          cuisineType: null,
          priceRange: null,
          seatingCapacity: null,
          neighborhood: location.neighborhood,
          targetDemographic: null,
          selectedDescriptors: [],
          userContext: [],
          dataFacts: {},
          factsUpdatedAt: null,
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Restaurant profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant profile" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/restaurant/profile
 *
 * Creates or updates a restaurant profile.
 * Automatically rebuilds userContext from selectedDescriptors.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const data = profileSchema.parse(body);

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

    // Determine the restaurant type to use for context conversion
    const restaurantType = data.restaurantType || location.restaurantType;

    // Build userContext from selectedDescriptors
    let userContext: string[] = [];
    if (data.selectedDescriptors && data.selectedDescriptors.length > 0 && restaurantType) {
      userContext = descriptorIdsToContexts(restaurantType, data.selectedDescriptors);
    }

    // Add any additional context from other fields
    if (data.conceptDescription) {
      userContext.push(`Concept: ${data.conceptDescription}`);
    }
    if (data.cuisineType) {
      userContext.push(`Cuisine: ${data.cuisineType}`);
    }
    if (data.targetDemographic) {
      userContext.push(`Target demographic: ${data.targetDemographic}`);
    }
    if (data.priceRange) {
      const priceDescriptions: Record<string, string> = {
        "$": "Budget-friendly pricing",
        "$$": "Moderate pricing",
        "$$$": "Upscale pricing",
        "$$$$": "Premium/luxury pricing",
      };
      userContext.push(priceDescriptions[data.priceRange] || `Price range: ${data.priceRange}`);
    }
    if (data.seatingCapacity) {
      if (data.seatingCapacity < 30) {
        userContext.push("Intimate venue with under 30 seats");
      } else if (data.seatingCapacity < 75) {
        userContext.push("Medium-sized venue with 30-75 seats");
      } else if (data.seatingCapacity < 150) {
        userContext.push("Large venue with 75-150 seats");
      } else {
        userContext.push(`High-capacity venue with ${data.seatingCapacity}+ seats`);
      }
    }
    if (data.neighborhood) {
      userContext.push(`Located in ${data.neighborhood}`);
    }

    // Upsert the profile
    const profile = await prisma.restaurantProfile.upsert({
      where: { locationId: data.locationId },
      create: {
        locationId: data.locationId,
        restaurantType: data.restaurantType,
        conceptDescription: data.conceptDescription,
        cuisineType: data.cuisineType,
        priceRange: data.priceRange,
        seatingCapacity: data.seatingCapacity,
        neighborhood: data.neighborhood,
        targetDemographic: data.targetDemographic,
        selectedDescriptors: data.selectedDescriptors || [],
        userContext,
      },
      update: {
        ...(data.restaurantType !== undefined && { restaurantType: data.restaurantType }),
        ...(data.conceptDescription !== undefined && { conceptDescription: data.conceptDescription }),
        ...(data.cuisineType !== undefined && { cuisineType: data.cuisineType }),
        ...(data.priceRange !== undefined && { priceRange: data.priceRange }),
        ...(data.seatingCapacity !== undefined && { seatingCapacity: data.seatingCapacity }),
        ...(data.neighborhood !== undefined && { neighborhood: data.neighborhood }),
        ...(data.targetDemographic !== undefined && { targetDemographic: data.targetDemographic }),
        ...(data.selectedDescriptors !== undefined && {
          selectedDescriptors: data.selectedDescriptors,
          userContext,
        }),
      },
    });

    // Also update the location's restaurantType if provided
    if (data.restaurantType) {
      await prisma.location.update({
        where: { id: data.locationId },
        data: { restaurantType: data.restaurantType },
      });
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid profile data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Restaurant profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update restaurant profile" },
      { status: 500 }
    );
  }
}
