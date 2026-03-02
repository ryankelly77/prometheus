/**
 * Unified Event Aggregator
 *
 * Combines all event sources into a single normalized list:
 * - US Holidays (hardcoded)
 * - SA Recurring Events (hardcoded)
 * - School Calendar (hardcoded)
 * - SeatGeek (API)
 *
 * All events are normalized to a common format for storage and AI consumption.
 */

import {
  getHolidaysInRange,
  getSAEventsInRange,
  type ResolvedHoliday,
  type ResolvedSAEvent,
} from "../data/holidays";
import { getSchoolEvents, type SchoolBreak } from "../data/school-calendar";
import {
  fetchSanAntonioEvents,
  type NormalizedEvent as SeatGeekEvent,
} from "./seatgeek";

// =============================================================================
// Types
// =============================================================================

export interface NormalizedEvent {
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // For multi-day events
  startTime?: string; // HH:MM
  category: EventCategory;
  subcategory?: string;
  source: EventSource;
  impactLevel: "high" | "medium" | "low";
  estimatedAttendance?: number;
  venue?: string;
  venueAddress?: string;
  venueLat?: number;
  venueLon?: number;
  distanceMiles?: number;
  impactNote: string;
  externalId?: string;
  externalUrl?: string;
  rawData?: unknown;
}

type EventCategory =
  | "HOLIDAY"
  | "SCHOOL_BREAK"
  | "FESTIVAL"
  | "SPORTS"
  | "CONCERT"
  | "THEATER"
  | "COMEDY"
  | "CONVENTION"
  | "RECURRING"
  | "OTHER";

type EventSource =
  | "US_HOLIDAYS"
  | "SA_RECURRING"
  | "SCHOOL_CALENDAR"
  | "SEATGEEK";

// =============================================================================
// Main Aggregator Function
// =============================================================================

/**
 * Aggregate all events for a restaurant within a date range.
 *
 * @param restaurantId - Restaurant location ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param restaurantLat - Restaurant latitude (for distance calculations)
 * @param restaurantLon - Restaurant longitude (for distance calculations)
 * @returns Sorted list of normalized events
 */
export async function aggregateEvents(
  restaurantId: string,
  startDate: string,
  endDate: string,
  restaurantLat: number,
  restaurantLon: number
): Promise<NormalizedEvent[]> {
  const allEvents: NormalizedEvent[] = [];

  // 1. Holidays (instant, hardcoded)
  const holidays = getHolidaysInRange(startDate, endDate);
  for (const h of holidays) {
    allEvents.push(normalizeHoliday(h));
  }

  // 2. SA Recurring Events (instant, hardcoded)
  const saEvents = getSAEventsInRange(startDate, endDate);
  for (const e of saEvents) {
    allEvents.push(normalizeSAEvent(e, startDate));
  }

  // 3. School Calendar (instant, hardcoded)
  const schoolEvents = getSchoolEvents(startDate, endDate);
  for (const s of schoolEvents) {
    allEvents.push(normalizeSchoolEvent(s));
  }

  // 4. SeatGeek (API call)
  try {
    const seatgeekEvents = await fetchSanAntonioEvents(
      startDate,
      endDate,
      restaurantLat,
      restaurantLon
    );
    for (const event of seatgeekEvents) {
      allEvents.push(normalizeSeatGeekEvent(event));
    }
  } catch (err) {
    console.error("[Aggregator] SeatGeek fetch failed, continuing without:", err);
    // Graceful degradation — holidays and school calendar still work
  }

  // Sort by date, then by impact level (high first)
  return sortEvents(allEvents);
}

/**
 * Get only the static events (no API calls).
 * Useful for quick lookups without waiting for SeatGeek.
 */
export function aggregateStaticEvents(
  startDate: string,
  endDate: string
): NormalizedEvent[] {
  const allEvents: NormalizedEvent[] = [];

  // Holidays
  const holidays = getHolidaysInRange(startDate, endDate);
  for (const h of holidays) {
    allEvents.push(normalizeHoliday(h));
  }

  // SA Recurring Events
  const saEvents = getSAEventsInRange(startDate, endDate);
  for (const e of saEvents) {
    allEvents.push(normalizeSAEvent(e, startDate));
  }

  // School Calendar
  const schoolEvents = getSchoolEvents(startDate, endDate);
  for (const s of schoolEvents) {
    allEvents.push(normalizeSchoolEvent(s));
  }

  return sortEvents(allEvents);
}

// =============================================================================
// Normalization Functions
// =============================================================================

function normalizeHoliday(h: ResolvedHoliday): NormalizedEvent {
  return {
    name: h.name,
    date: h.date,
    category: "HOLIDAY",
    source: "US_HOLIDAYS",
    impactLevel: h.impactLevel,
    impactNote: h.restaurantImpact,
  };
}

function normalizeSAEvent(e: ResolvedSAEvent, fallbackDate: string): NormalizedEvent {
  // SA recurring events are month-based, use first of month as date
  const year = fallbackDate.slice(0, 4);
  const monthStr = String(e.month).padStart(2, "0");
  const date = `${year}-${monthStr}-01`;

  return {
    name: e.name,
    date,
    category: mapSAEventCategory(e.name),
    source: "SA_RECURRING",
    impactLevel: e.impactLevel,
    impactNote: e.restaurantImpact,
  };
}

function normalizeSchoolEvent(s: SchoolBreak): NormalizedEvent {
  return {
    name: `${s.name} (${s.district})`,
    date: s.startDate,
    endDate: s.endDate,
    category: "SCHOOL_BREAK",
    source: "SCHOOL_CALENDAR",
    impactLevel: mapSchoolImpactLevel(s.type),
    impactNote: s.impactNote,
  };
}

function normalizeSeatGeekEvent(event: SeatGeekEvent): NormalizedEvent {
  return {
    name: event.name,
    date: event.date,
    startTime: event.startTime || undefined,
    category: event.category as EventCategory,
    subcategory: event.subcategory || undefined,
    source: "SEATGEEK",
    impactLevel: event.impactLevel,
    estimatedAttendance: event.estimatedAttendance || undefined,
    venue: event.venue,
    venueAddress: event.venueAddress || undefined,
    venueLat: event.venueLat,
    venueLon: event.venueLon,
    distanceMiles: event.distanceMiles,
    impactNote: event.impactNote,
    externalId: event.externalId,
    externalUrl: event.externalUrl,
    rawData: event.rawData,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapSAEventCategory(name: string): EventCategory {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("fiesta") || lowerName.includes("parade")) return "FESTIVAL";
  if (lowerName.includes("rodeo")) return "FESTIVAL";
  if (lowerName.includes("spurs")) return "SPORTS";
  if (lowerName.includes("market")) return "RECURRING";
  if (lowerName.includes("festival")) return "FESTIVAL";
  return "RECURRING";
}

function mapSchoolImpactLevel(
  type: SchoolBreak["type"]
): "high" | "medium" | "low" {
  switch (type) {
    case "spring_break":
      return "high"; // 200K+ students off simultaneously
    case "summer_break":
      return "high"; // Major seasonal shift
    case "winter_break":
      return "high"; // Holiday season
    case "holiday_break":
      return "medium"; // Thanksgiving, etc.
    case "teacher_workday":
      return "low";
    default:
      return "medium";
  }
}

function sortEvents(events: NormalizedEvent[]): NormalizedEvent[] {
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  return events.sort((a, b) => {
    // Sort by date first
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    // Then by impact level (high first)
    const aImpact = impactOrder[a.impactLevel] ?? 2;
    const bImpact = impactOrder[b.impactLevel] ?? 2;
    return aImpact - bImpact;
  });
}

// =============================================================================
// AI Context Generation
// =============================================================================

/**
 * Generate a formatted string of events for AI prompts.
 * Groups events by date and includes impact notes.
 */
export function getEventsContextForAI(events: NormalizedEvent[]): string {
  if (events.length === 0) {
    return "";
  }

  const lines: string[] = ["LOCAL EVENTS IN THIS PERIOD:"];

  // Group by date
  const byDate: Record<string, NormalizedEvent[]> = {};
  for (const event of events) {
    if (!byDate[event.date]) {
      byDate[event.date] = [];
    }
    byDate[event.date].push(event);
  }

  // Output grouped by date
  for (const [date, dateEvents] of Object.entries(byDate).sort()) {
    lines.push(`\n${date}:`);
    for (const event of dateEvents) {
      const impactBadge =
        event.impactLevel === "high"
          ? "[HIGH]"
          : event.impactLevel === "medium"
            ? "[MED]"
            : "[LOW]";
      lines.push(`  ${impactBadge} ${event.name}`);
      if (event.venue && event.distanceMiles !== undefined) {
        lines.push(`    Venue: ${event.venue} (${event.distanceMiles} mi)`);
      }
      lines.push(`    ${event.impactNote}`);
    }
  }

  return lines.join("\n");
}

/**
 * Get high-impact events only (for prominent display).
 */
export function getHighImpactEvents(events: NormalizedEvent[]): NormalizedEvent[] {
  return events.filter((e) => e.impactLevel === "high");
}

/**
 * Get events for a specific date.
 */
export function getEventsForDate(
  events: NormalizedEvent[],
  date: string
): NormalizedEvent[] {
  return events.filter((e) => {
    // Check if date falls within event range (for multi-day events)
    if (e.endDate) {
      return date >= e.date && date <= e.endDate;
    }
    return e.date === date;
  });
}
