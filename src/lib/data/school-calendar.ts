/**
 * San Antonio School Calendar Reference Data
 *
 * Known dates for school breaks and their impact on restaurant traffic.
 * No API required — dates are published annually by each district.
 *
 * IMPORTANT: These dates need annual verification. Sources:
 * - Northside ISD: https://nisd.net (largest district, 100K students)
 * - North East ISD: https://neisd.net (60K students)
 * - San Antonio ISD: https://saisd.net (45K students, downtown district)
 * - Alamo Heights ISD: https://ahisd.net (affluent demographic)
 * - UTSA: https://utsa.edu/registrar (35K students)
 *
 * Districts typically publish next year's calendar by March.
 * Update this file once annually when calendars are released.
 */

export interface SchoolBreak {
  name: string;
  district: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type:
    | "spring_break"
    | "summer_break"
    | "winter_break"
    | "holiday_break"
    | "teacher_workday";
  impactNote: string;
}

// =============================================================================
// 2025-2026 School Year
// =============================================================================

export const SA_SCHOOL_CALENDAR_2025_2026: SchoolBreak[] = [
  // ---------------------------------------------------------------------------
  // THANKSGIVING BREAK
  // ---------------------------------------------------------------------------
  {
    name: "Thanksgiving Break",
    district: "All SA Districts",
    startDate: "2025-11-24",
    endDate: "2025-11-28",
    type: "holiday_break",
    impactNote:
      "Full week for most districts. Wednesday before Thanksgiving is one of the biggest bar nights. Thursday most restaurants closed. Friday-Sunday recovery with shopping traffic.",
  },

  // ---------------------------------------------------------------------------
  // WINTER BREAK (SAISD starts Dec 19, others Dec 22 — use widest window)
  // ---------------------------------------------------------------------------
  {
    name: "Winter Break",
    district: "All SA Districts",
    startDate: "2025-12-19",
    endDate: "2026-01-06",
    type: "winter_break",
    impactNote:
      "Effective break period Dec 19-Jan 6 (SAISD starts early). Families off. Tourism peaks. Fine dining sees holiday reservations. Casual spots see family traffic.",
  },

  // ---------------------------------------------------------------------------
  // SPRING BREAK (ALL major districts aligned — same week)
  // ---------------------------------------------------------------------------
  {
    name: "Spring Break",
    district: "All SA Districts",
    startDate: "2026-03-09",
    endDate: "2026-03-13",
    type: "spring_break",
    impactNote:
      "All major SA districts off simultaneously. 200K+ students. Peak tourism week — River Walk, Pearl area see heavy family traffic. Restaurants should expect higher lunch volumes and tourist-driven dinner reservations.",
  },

  // ---------------------------------------------------------------------------
  // SUMMER BREAK
  // ---------------------------------------------------------------------------
  {
    name: "Summer Break",
    district: "All SA Districts",
    startDate: "2026-06-05",
    endDate: "2026-08-17",
    type: "summer_break",
    impactNote:
      "Tourism season but locals travel. Combined with heat, this is the toughest period for outdoor dining.",
  },

  // ---------------------------------------------------------------------------
  // UNIVERSITY CALENDARS (affect downtown/Pearl area traffic)
  // ---------------------------------------------------------------------------
  {
    name: "Spring Break",
    district: "SA Universities (UTSA/Trinity/UIW)",
    startDate: "2026-03-09",
    endDate: "2026-03-13",
    type: "spring_break",
    impactNote:
      "Universities aligned with K-12. Combined 50K+ college students off. Some leave town, others increase local dining and nightlife.",
  },
  {
    name: "UTSA Finals / End of Semester",
    district: "UTSA",
    startDate: "2026-05-04",
    endDate: "2026-05-14",
    type: "holiday_break",
    impactNote:
      "Students focused on finals then leave for summer. Reduced foot traffic.",
  },
  {
    name: "University Summer Break",
    district: "SA Universities (UTSA/Trinity/UIW)",
    startDate: "2026-05-15",
    endDate: "2026-08-24",
    type: "summer_break",
    impactNote:
      "Many students leave SA. Reduced daytime population near campus areas. UTSA downtown campus impact on Pearl area.",
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all school events that overlap with a date range.
 * Use for finding what breaks fall within an analysis period.
 */
export function getSchoolEvents(
  startDate: string,
  endDate: string
): SchoolBreak[] {
  return SA_SCHOOL_CALENDAR_2025_2026.filter(
    (event) => event.startDate <= endDate && event.endDate >= startDate
  );
}

/**
 * Get school events active on a specific date.
 */
export function getActiveSchoolEvents(date: string): SchoolBreak[] {
  return SA_SCHOOL_CALENDAR_2025_2026.filter(
    (event) => date >= event.startDate && date <= event.endDate
  );
}

/**
 * Get a human-readable summary of school status for a date.
 * Suitable for AI prompt context.
 */
export function getSchoolContext(date: string): string {
  const active = getActiveSchoolEvents(date);

  if (active.length === 0) {
    return "School in session for all districts.";
  }

  const lines = ["SCHOOL BREAKS ACTIVE:"];
  for (const event of active) {
    lines.push(
      `- ${event.district}: ${event.name} (${event.startDate} to ${event.endDate})`
    );
    lines.push(`  Impact: ${event.impactNote}`);
  }

  return lines.join("\n");
}

/**
 * Get school context for a date range (for AI prompts analyzing a period).
 * Shows all breaks that overlap with the analysis window.
 */
export function getSchoolContextForRange(
  startDate: string,
  endDate: string
): string {
  const events = getSchoolEvents(startDate, endDate);

  if (events.length === 0) {
    return "";
  }

  const lines = ["SCHOOL CALENDAR EVENTS IN THIS PERIOD:"];

  // Group by type for clarity
  const byType: Record<string, SchoolBreak[]> = {};
  for (const event of events) {
    if (!byType[event.type]) {
      byType[event.type] = [];
    }
    byType[event.type].push(event);
  }

  // Output grouped
  for (const [type, typeEvents] of Object.entries(byType)) {
    const typeLabel = type.replace("_", " ").toUpperCase();
    lines.push(`\n${typeLabel}:`);
    for (const event of typeEvents) {
      lines.push(
        `- ${event.district}: ${event.startDate} to ${event.endDate}`
      );
      lines.push(`  ${event.impactNote}`);
    }
  }

  return lines.join("\n");
}

/**
 * Check if a date falls during any spring break.
 * Spring break is particularly relevant for Pearl District restaurants.
 */
export function isSpringBreakActive(date: string): boolean {
  return SA_SCHOOL_CALENDAR_2025_2026.some(
    (event) =>
      event.type === "spring_break" &&
      date >= event.startDate &&
      date <= event.endDate
  );
}

/**
 * Check if a date falls during summer break.
 */
export function isSummerBreakActive(date: string): boolean {
  return SA_SCHOOL_CALENDAR_2025_2026.some(
    (event) =>
      event.type === "summer_break" &&
      date >= event.startDate &&
      date <= event.endDate
  );
}
