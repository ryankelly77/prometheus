/**
 * Events API
 *
 * GET /api/events?locationId=xxx&startDate=2026-03-01&endDate=2026-03-31
 *
 * Returns all events in the date range for the restaurant.
 * - Static events (holidays, school calendar, SA recurring) are computed on the fly
 * - SeatGeek events are cached in the local_events table and refreshed daily
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  aggregateStaticEvents,
  getEventsContextForAI,
  type NormalizedEvent,
} from "@/lib/events/aggregator";
import { fetchSanAntonioEvents } from "@/lib/events/seatgeek";
import { EventCategory, EventSource, EventImpact } from "@/generated/prisma";

// =============================================================================
// GET - Fetch events for a date range
// =============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locationId = searchParams.get("locationId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const includeAIContext = searchParams.get("aiContext") === "true";

  if (!locationId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "locationId, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  try {
    // Get location for coordinates
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        eventsEnabled: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // 1. Get static events (instant, computed from hardcoded data)
    const staticEvents = aggregateStaticEvents(startDate, endDate);

    // 2. Get cached SeatGeek events from database
    const cachedEvents = await prisma.localEvent.findMany({
      where: {
        locationId,
        source: "SEATGEEK",
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: "asc" },
    });

    // Convert cached events to normalized format
    const seatgeekEvents: NormalizedEvent[] = cachedEvents.map((e) => ({
      name: e.name,
      date: e.date.toISOString().split("T")[0],
      endDate: e.endDate?.toISOString().split("T")[0],
      startTime: e.startTime?.toISOString().split("T")[1]?.slice(0, 5),
      category: e.category as NormalizedEvent["category"],
      subcategory: e.subcategory || undefined,
      source: "SEATGEEK" as const,
      impactLevel: mapImpactLevel(e.impactLevel),
      estimatedAttendance: e.expectedAttendance || undefined,
      venue: e.venueName || undefined,
      venueAddress: e.venueAddress || undefined,
      venueLat: e.venueLat || undefined,
      venueLng: e.venueLng || undefined,
      distanceMiles: e.distanceMiles || undefined,
      impactNote: e.impactNote || "",
      externalId: e.externalId || undefined,
      externalUrl: e.externalUrl || undefined,
    }));

    // Combine and sort all events
    const allEvents = [...staticEvents, ...seatgeekEvents].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return (impactOrder[a.impactLevel] ?? 2) - (impactOrder[b.impactLevel] ?? 2);
    });

    // Build response
    const response: {
      events: NormalizedEvent[];
      meta: {
        locationId: string;
        locationName: string;
        startDate: string;
        endDate: string;
        totalEvents: number;
        bySource: Record<string, number>;
        byImpact: Record<string, number>;
        eventsEnabled: boolean;
        cachedSeatGeekCount: number;
      };
      aiContext?: string;
    } = {
      events: allEvents,
      meta: {
        locationId,
        locationName: location.name,
        startDate,
        endDate,
        totalEvents: allEvents.length,
        bySource: countByField(allEvents, "source"),
        byImpact: countByField(allEvents, "impactLevel"),
        eventsEnabled: location.eventsEnabled,
        cachedSeatGeekCount: seatgeekEvents.length,
      },
    };

    // Optionally include AI context string
    if (includeAIContext) {
      response.aiContext = getEventsContextForAI(allEvents);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Events API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Refresh SeatGeek events for a location
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationId, startDate, endDate } = body;

    if (!locationId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "locationId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    // Get location
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (!location.latitude || !location.longitude) {
      return NextResponse.json(
        { error: "Location coordinates required for event sync" },
        { status: 400 }
      );
    }

    // Fetch fresh events from SeatGeek
    const events = await fetchSanAntonioEvents(
      startDate,
      endDate,
      location.latitude,
      location.longitude
    );

    // Upsert events into database
    let created = 0;
    let updated = 0;

    for (const event of events) {
      const result = await prisma.localEvent.upsert({
        where: {
          locationId_source_externalId: {
            locationId,
            source: "SEATGEEK",
            externalId: event.externalId,
          },
        },
        create: {
          locationId,
          name: event.name,
          date: new Date(event.date),
          startTime: event.startTime ? new Date(`${event.date}T${event.startTime}:00`) : null,
          venueName: event.venue,
          venueAddress: event.venueAddress || null,
          venueLat: event.venueLat,
          venueLng: event.venueLon,
          distanceMiles: event.distanceMiles,
          category: mapCategory(event.category),
          subcategory: event.subcategory || null,
          expectedAttendance: event.estimatedAttendance || null,
          popularityScore: event.popularity,
          impactLevel: mapImpactToEnum(event.impactLevel),
          impactNote: event.impactNote,
          source: "SEATGEEK",
          externalId: event.externalId,
          externalUrl: event.externalUrl,
          rawData: event.rawData as object,
        },
        update: {
          name: event.name,
          startTime: event.startTime ? new Date(`${event.date}T${event.startTime}:00`) : null,
          venueName: event.venue,
          venueAddress: event.venueAddress || null,
          distanceMiles: event.distanceMiles,
          expectedAttendance: event.estimatedAttendance || null,
          popularityScore: event.popularity,
          impactLevel: mapImpactToEnum(event.impactLevel),
          impactNote: event.impactNote,
          externalUrl: event.externalUrl,
          rawData: event.rawData as object,
          updatedAt: new Date(),
        },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    }

    // Enable events for this location if not already
    if (events.length > 0) {
      await prisma.location.update({
        where: { id: locationId },
        data: { eventsEnabled: true },
      });
    }

    return NextResponse.json({
      success: true,
      fetched: events.length,
      created,
      updated,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("[Events API] Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync events" },
      { status: 500 }
    );
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapImpactLevel(
  impact: EventImpact | null
): "high" | "medium" | "low" {
  switch (impact) {
    case "MAJOR":
    case "HIGH":
      return "high";
    case "MODERATE":
      return "medium";
    case "LOW":
    case "MINIMAL":
    default:
      return "low";
  }
}

function mapImpactToEnum(impact: "high" | "medium" | "low"): EventImpact {
  switch (impact) {
    case "high":
      return "HIGH";
    case "medium":
      return "MODERATE";
    case "low":
      return "LOW";
  }
}

function mapCategory(category: string): EventCategory {
  const mapping: Record<string, EventCategory> = {
    SPORTS: "SPORTS",
    CONCERT: "CONCERT",
    THEATER: "THEATER",
    COMEDY: "COMEDY",
    CONVENTION: "CONVENTION",
    CONFERENCE: "CONFERENCE",
    FESTIVAL: "FESTIVAL",
    HOLIDAY: "HOLIDAY",
    SCHOOL_BREAK: "SCHOOL_BREAK",
    RECURRING: "COMMUNITY",
    OTHER: "OTHER",
  };
  return mapping[category] || "OTHER";
}

function countByField(
  events: NormalizedEvent[],
  field: "source" | "impactLevel"
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    const value = event[field];
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}
