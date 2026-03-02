/**
 * SeatGeek API Client
 *
 * Free API for fetching local events (concerts, sports, theater, etc.)
 * Register at seatgeek.com/build to get a client_id
 *
 * No cost, just needs a client_id in environment variables.
 */

const SEATGEEK_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID;
const SEATGEEK_BASE = "https://api.seatgeek.com/2";

// =============================================================================
// Types
// =============================================================================

interface SeatGeekVenue {
  id: number;
  name: string;
  city: string;
  state: string;
  postal_code: string;
  address: string;
  location: { lat: number; lon: number };
  capacity: number | null;
}

interface SeatGeekPerformer {
  id: number;
  name: string;
  type: string;
  image: string;
  score: number;
}

interface SeatGeekStats {
  listing_count: number;
  average_price: number;
  lowest_price: number;
  highest_price: number;
}

interface SeatGeekEvent {
  id: number;
  title: string;
  type: string; // 'concert', 'sports', 'theater', 'comedy', etc.
  datetime_local: string;
  datetime_utc: string;
  visible_until_utc: string;
  venue: SeatGeekVenue;
  performers: SeatGeekPerformer[];
  stats: SeatGeekStats;
  popularity: number;
  score: number;
  url: string;
  short_title: string;
}

interface SeatGeekResponse {
  events: SeatGeekEvent[];
  meta: {
    total: number;
    took: number;
    page: number;
    per_page: number;
  };
}

export interface NormalizedEvent {
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  category: EventCategory;
  subcategory: string | null;
  source: "seatgeek";
  impactLevel: "high" | "medium" | "low";
  estimatedAttendance: number | null;
  venue: string;
  venueAddress: string | null;
  venueLat: number;
  venueLon: number;
  distanceMiles: number;
  impactNote: string;
  externalId: string;
  externalUrl: string;
  popularity: number;
  rawData: SeatGeekEvent;
}

type EventCategory =
  | "SPORTS"
  | "CONCERT"
  | "THEATER"
  | "COMEDY"
  | "CONFERENCE"
  | "CONVENTION"
  | "FESTIVAL"
  | "OTHER";

// =============================================================================
// Key San Antonio Venues
// =============================================================================

export const SA_VENUES = [
  {
    name: "Alamodome",
    capacity: 65000,
    lat: 29.4167,
    lon: -98.4911,
    note: "Major concerts, college football, large events",
  },
  {
    name: "AT&T Center",
    capacity: 18418,
    lat: 29.427,
    lon: -98.4375,
    note: "Spurs home, major concerts",
  },
  {
    name: "Frost Bank Center",
    capacity: 18418,
    lat: 29.427,
    lon: -98.4375,
    note: "Renamed from AT&T Center (2024)",
  },
  {
    name: "Majestic Theatre",
    capacity: 2311,
    lat: 29.4249,
    lon: -98.4895,
    note: "Broadway shows, concerts, downtown",
  },
  {
    name: "Tobin Center",
    capacity: 1738,
    lat: 29.4389,
    lon: -98.4866,
    note: "Performing arts, near River Walk",
  },
  {
    name: "Freeman Coliseum",
    capacity: 10000,
    lat: 29.4489,
    lon: -98.4317,
    note: "Rodeo, concerts, exhibitions",
  },
  {
    name: "Boeing Center at Tech Port",
    capacity: 3300,
    lat: 29.3462,
    lon: -98.4695,
    note: "Concerts, esports",
  },
  {
    name: "Aztec Theatre",
    capacity: 1800,
    lat: 29.4241,
    lon: -98.4935,
    note: "Historic theater, downtown concerts",
  },
];

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch events from SeatGeek for San Antonio area.
 * Returns normalized events with distance calculated from restaurant location.
 */
export async function fetchSanAntonioEvents(
  startDate: string, // YYYY-MM-DD
  endDate: string, // YYYY-MM-DD
  restaurantLat: number,
  restaurantLon: number
): Promise<NormalizedEvent[]> {
  if (!SEATGEEK_CLIENT_ID) {
    console.warn("[SeatGeek] No SEATGEEK_CLIENT_ID configured, skipping event fetch");
    return [];
  }

  try {
    const params = new URLSearchParams({
      client_id: SEATGEEK_CLIENT_ID,
      "venue.city": "San Antonio",
      "venue.state": "TX",
      "datetime_local.gte": startDate,
      "datetime_local.lte": endDate,
      per_page: "100",
      sort: "datetime_local.asc",
    });

    const url = `${SEATGEEK_BASE}/events?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[SeatGeek] API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: SeatGeekResponse = await response.json();
    console.log(`[SeatGeek] Fetched ${data.events.length} events for ${startDate} to ${endDate}`);

    return data.events.map((event) =>
      normalizeEvent(event, restaurantLat, restaurantLon)
    );
  } catch (error) {
    console.error("[SeatGeek] Failed to fetch events:", error);
    return [];
  }
}

/**
 * Fetch events near a specific venue (useful for targeted queries).
 */
export async function fetchEventsNearVenue(
  venueName: string,
  startDate: string,
  endDate: string,
  restaurantLat: number,
  restaurantLon: number
): Promise<NormalizedEvent[]> {
  if (!SEATGEEK_CLIENT_ID) return [];

  try {
    const params = new URLSearchParams({
      client_id: SEATGEEK_CLIENT_ID,
      q: venueName,
      "datetime_local.gte": startDate,
      "datetime_local.lte": endDate,
      per_page: "50",
    });

    const url = `${SEATGEEK_BASE}/events?${params}`;
    const response = await fetch(url);

    if (!response.ok) return [];

    const data: SeatGeekResponse = await response.json();
    return data.events.map((event) =>
      normalizeEvent(event, restaurantLat, restaurantLon)
    );
  } catch {
    return [];
  }
}

// =============================================================================
// Normalization Functions
// =============================================================================

function normalizeEvent(
  event: SeatGeekEvent,
  restLat: number,
  restLon: number
): NormalizedEvent {
  const distance = haversineDistance(
    restLat,
    restLon,
    event.venue.location.lat,
    event.venue.location.lon
  );

  const capacity = event.venue.capacity || estimateCapacity(event.venue.name);
  const impactLevel = calculateImpactLevel(capacity, distance, event.popularity);
  const datetime = event.datetime_local.split("T");

  return {
    name: event.title,
    date: datetime[0],
    startTime: datetime[1]?.slice(0, 5) || null, // HH:MM
    category: mapSeatGeekType(event.type),
    subcategory: event.type,
    source: "seatgeek",
    impactLevel,
    estimatedAttendance: capacity,
    venue: event.venue.name,
    venueAddress: event.venue.address || null,
    venueLat: event.venue.location.lat,
    venueLon: event.venue.location.lon,
    distanceMiles: Math.round(distance * 10) / 10,
    impactNote: generateImpactNote(event, distance, impactLevel, capacity),
    externalId: String(event.id),
    externalUrl: event.url,
    popularity: event.popularity,
    rawData: event,
  };
}

/**
 * Map SeatGeek event types to our EventCategory enum.
 */
function mapSeatGeekType(type: string): EventCategory {
  const mapping: Record<string, EventCategory> = {
    concert: "CONCERT",
    music_festival: "FESTIVAL",
    sports: "SPORTS",
    nba: "SPORTS",
    nfl: "SPORTS",
    mlb: "SPORTS",
    nhl: "SPORTS",
    mls: "SPORTS",
    ncaa_football: "SPORTS",
    ncaa_basketball: "SPORTS",
    theater: "THEATER",
    broadway_tickets_national: "THEATER",
    comedy: "COMEDY",
    family: "OTHER",
    classical: "CONCERT",
    dance_performance_tour: "THEATER",
  };

  return mapping[type.toLowerCase()] || "OTHER";
}

/**
 * Calculate impact level based on venue capacity, distance, and popularity.
 */
function calculateImpactLevel(
  capacity: number,
  distanceMiles: number,
  popularity: number
): "high" | "medium" | "low" {
  // Large venue + close = high impact
  if (capacity >= 10000 && distanceMiles <= 5) return "high";
  if (capacity >= 5000 && distanceMiles <= 3) return "high";
  if (capacity >= 2000 && distanceMiles <= 2) return "high";

  // Medium impact scenarios
  if (capacity >= 2000 && distanceMiles <= 5) return "medium";
  if (capacity >= 10000 && distanceMiles <= 10) return "medium";
  if (capacity >= 1000 && distanceMiles <= 3) return "medium";

  // High popularity can bump up impact
  if (popularity > 0.8 && distanceMiles <= 5) return "medium";

  return "low";
}

/**
 * Generate restaurant-specific impact note for AI context.
 */
function generateImpactNote(
  event: SeatGeekEvent,
  distance: number,
  impact: "high" | "medium" | "low",
  capacity: number
): string {
  const venue = event.venue.name;
  const capStr = capacity.toLocaleString();
  const distStr = distance.toFixed(1);
  const eventType = event.type.replace(/_/g, " ");

  if (impact === "high") {
    return `${venue} (${capStr} capacity) is ${distStr} miles away. ${eventType} event — expect significant pre/post-event dining traffic.`;
  }
  if (impact === "medium") {
    return `${venue} ${eventType} event (${capStr} capacity) at ${distStr} miles may drive overflow dining traffic.`;
  }
  return `${venue} event at ${distStr} miles — minimal direct impact expected.`;
}

/**
 * Estimate venue capacity if not provided by SeatGeek.
 */
function estimateCapacity(venueName: string): number {
  const known = SA_VENUES.find(
    (v) => venueName.toLowerCase().includes(v.name.toLowerCase())
  );
  if (known) return known.capacity;

  // Default estimates by venue name patterns
  if (venueName.toLowerCase().includes("stadium")) return 30000;
  if (venueName.toLowerCase().includes("arena")) return 10000;
  if (venueName.toLowerCase().includes("center")) return 5000;
  if (venueName.toLowerCase().includes("theatre") || venueName.toLowerCase().includes("theater")) return 2000;
  if (venueName.toLowerCase().includes("club")) return 500;
  if (venueName.toLowerCase().includes("bar")) return 200;

  return 1000; // Default fallback
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate distance between two points using Haversine formula.
 * Returns distance in miles.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get distance from Pearl District (MCC's location) to major SA venues.
 * Useful for understanding which venues matter for MCC.
 */
export function getPearlDistanceToVenues(): Array<{
  venue: string;
  distanceMiles: number;
  capacity: number;
}> {
  // Pearl District coordinates (approximate center)
  const pearlLat = 29.4429;
  const pearlLon = -98.4794;

  return SA_VENUES.map((venue) => ({
    venue: venue.name,
    distanceMiles:
      Math.round(haversineDistance(pearlLat, pearlLon, venue.lat, venue.lon) * 10) / 10,
    capacity: venue.capacity,
  })).sort((a, b) => a.distanceMiles - b.distanceMiles);
}
