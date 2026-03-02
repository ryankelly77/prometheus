/**
 * National Holidays and Local Events Reference Data
 *
 * Known dates for holiday context in AI analysis.
 * No API required — dates are fixed or calculable.
 */

export interface Holiday {
  name: string;
  date: string; // MM-DD for fixed, 'floating' for calculated
  type: "fixed" | "floating";
  impactLevel: "high" | "medium" | "low";
  restaurantImpact: string;
}

export interface RecurringEvent {
  name: string;
  month?: number; // single month
  months?: number[]; // multiple months (1-12)
  impactLevel: "high" | "medium" | "low";
  restaurantImpact: string;
}

export interface ResolvedHoliday {
  name: string;
  date: string; // YYYY-MM-DD
  impactLevel: "high" | "medium" | "low";
  restaurantImpact: string;
}

// ============================================================================
// US National Holidays
// ============================================================================

export const US_HOLIDAYS: Holiday[] = [
  // HIGH IMPACT — major revenue drivers or closures
  {
    name: "New Year's Eve",
    date: "12-31",
    type: "fixed",
    impactLevel: "high",
    restaurantImpact:
      "Major dining-out night. Premium pricing common. Revenue typically 80-150% above normal.",
  },
  {
    name: "New Year's Day",
    date: "01-01",
    type: "fixed",
    impactLevel: "high",
    restaurantImpact:
      "Brunch-heavy. Some restaurants closed. Revenue varies widely.",
  },
  {
    name: "Valentine's Day",
    date: "02-14",
    type: "fixed",
    impactLevel: "high",
    restaurantImpact:
      "Biggest reservation night of the year for fine dining. Revenue typically 100-200% above normal.",
  },
  {
    name: "Easter",
    date: "floating",
    type: "floating",
    impactLevel: "high",
    restaurantImpact:
      "Strong brunch day. Dinner can be slow. Family-oriented.",
  },
  {
    name: "Mother's Day",
    date: "floating",
    type: "floating",
    impactLevel: "high",
    restaurantImpact:
      "Highest brunch volume of the year. Reservations essential.",
  },
  {
    name: "Father's Day",
    date: "floating",
    type: "floating",
    impactLevel: "medium",
    restaurantImpact:
      "Strong but below Mother's Day. Dinner heavier than brunch.",
  },
  {
    name: "Independence Day",
    date: "07-04",
    type: "fixed",
    impactLevel: "high",
    restaurantImpact:
      "Mixed — outdoor venues benefit, some restaurants close. Depends on location.",
  },
  {
    name: "Thanksgiving",
    date: "floating",
    type: "floating",
    impactLevel: "high",
    restaurantImpact:
      "Most restaurants closed. Wednesday before is a big bar/dining night.",
  },
  {
    name: "Thanksgiving Eve",
    date: "floating",
    type: "floating",
    impactLevel: "high",
    restaurantImpact:
      "One of the biggest bar nights of the year. Strong late-night revenue.",
  },
  {
    name: "Christmas Eve",
    date: "12-24",
    type: "fixed",
    impactLevel: "high",
    restaurantImpact:
      "Premium dining night. Many restaurants offer special menus. Revenue 50-150% above normal.",
  },
  {
    name: "Christmas Day",
    date: "12-25",
    type: "fixed",
    impactLevel: "high",
    restaurantImpact:
      "Most restaurants closed. Those open see very high demand.",
  },

  // MEDIUM IMPACT
  {
    name: "Super Bowl Sunday",
    date: "floating",
    type: "floating",
    impactLevel: "medium",
    restaurantImpact:
      "Bar revenue up, sit-down dining often down. Sports bars thrive.",
  },
  {
    name: "Cinco de Mayo",
    date: "05-05",
    type: "fixed",
    impactLevel: "medium",
    restaurantImpact:
      "Strong in Texas/Southwest. Bar and Mexican restaurant revenue spikes.",
  },
  {
    name: "Halloween",
    date: "10-31",
    type: "fixed",
    impactLevel: "medium",
    restaurantImpact:
      "Early dinner rush, then bar/late-night picks up. Family restaurants see early surge.",
  },
  {
    name: "Memorial Day",
    date: "floating",
    type: "floating",
    impactLevel: "medium",
    restaurantImpact:
      "Weekend boost. Monday can be slow or closed. Outdoor dining popular.",
  },
  {
    name: "Labor Day",
    date: "floating",
    type: "floating",
    impactLevel: "medium",
    restaurantImpact:
      "Similar to Memorial Day. End of summer. Weekend boost.",
  },
  {
    name: "St. Patrick's Day",
    date: "03-17",
    type: "fixed",
    impactLevel: "medium",
    restaurantImpact:
      "Bar revenue spikes. Irish pubs and bars see 2-3x normal.",
  },

  // LOW IMPACT — but still worth flagging
  {
    name: "MLK Day",
    date: "floating",
    type: "floating",
    impactLevel: "low",
    restaurantImpact: "Modest lunch boost from day off. Otherwise normal.",
  },
  {
    name: "Presidents Day",
    date: "floating",
    type: "floating",
    impactLevel: "low",
    restaurantImpact: "Minor. Some lunch boost.",
  },
  {
    name: "Juneteenth",
    date: "06-19",
    type: "fixed",
    impactLevel: "low",
    restaurantImpact: "Federal holiday since 2021. Some lunch boost.",
  },
  {
    name: "Columbus Day",
    date: "floating",
    type: "floating",
    impactLevel: "low",
    restaurantImpact: "Minor. Most businesses open.",
  },
  {
    name: "Veterans Day",
    date: "11-11",
    type: "fixed",
    impactLevel: "low",
    restaurantImpact: "Minor. Some lunch boost. Veterans promotions common.",
  },
];

// ============================================================================
// San Antonio / Texas Recurring Events
// ============================================================================

export const SA_RECURRING_EVENTS: RecurringEvent[] = [
  {
    name: "Fiesta San Antonio",
    month: 4,
    impactLevel: "high",
    restaurantImpact:
      "Massive 10-day festival (mid-April). Downtown and Pearl District restaurants see 30-50% revenue boost.",
  },
  {
    name: "San Antonio Stock Show & Rodeo",
    month: 2,
    impactLevel: "high",
    restaurantImpact:
      "18-day event (Feb). Significant tourism boost. Hotels full. Strong dinner traffic.",
  },
  {
    name: "Spurs Regular Season",
    months: [10, 11, 12, 1, 2, 3, 4],
    impactLevel: "medium",
    restaurantImpact:
      "Home games drive pre/post-game dining near AT&T Center and downtown. 41 home games per season.",
  },
  {
    name: "Holiday River Parade & Lighting",
    month: 11,
    impactLevel: "medium",
    restaurantImpact:
      "Day after Thanksgiving. River Walk restaurants packed. Major tourism event.",
  },
  {
    name: "Luminaria Arts Festival",
    month: 11,
    impactLevel: "medium",
    restaurantImpact:
      "Contemporary arts festival. Downtown traffic spike. Usually early November.",
  },
  {
    name: "Battle of Flowers Parade",
    month: 4,
    impactLevel: "high",
    restaurantImpact:
      "Part of Fiesta. Friday parade draws 350K+ spectators. Downtown restaurants extremely busy.",
  },
  {
    name: "SXSW Spillover",
    month: 3,
    impactLevel: "low",
    restaurantImpact:
      "Austin event but some tourism spillover to San Antonio. Minor impact.",
  },
  {
    name: "Pearl Farmers Market",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    impactLevel: "medium",
    restaurantImpact:
      "Weekly Saturday/Sunday market. Drives strong brunch traffic to Pearl District restaurants year-round.",
  },
];

// ============================================================================
// Floating Holiday Date Calculations
// ============================================================================

/**
 * Calculate Easter Sunday for a given year (Anonymous Gregorian algorithm)
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Get the Nth occurrence of a weekday in a month
 * weekday: 0=Sunday, 1=Monday, etc.
 * n: 1=first, 2=second, etc., -1=last
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number
): Date {
  if (n === -1) {
    // Last occurrence
    const lastDay = new Date(year, month + 1, 0);
    const diff = (lastDay.getDay() - weekday + 7) % 7;
    return new Date(year, month, lastDay.getDate() - diff);
  }

  const firstDay = new Date(year, month, 1);
  const diff = (weekday - firstDay.getDay() + 7) % 7;
  const firstOccurrence = 1 + diff;
  const nthOccurrence = firstOccurrence + (n - 1) * 7;
  return new Date(year, month, nthOccurrence);
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get all holiday dates resolved for a given year
 */
export function getHolidayDates(year: number): ResolvedHoliday[] {
  const holidays: ResolvedHoliday[] = [];

  for (const h of US_HOLIDAYS) {
    let resolvedDate: string;

    if (h.type === "fixed") {
      resolvedDate = `${year}-${h.date}`;
    } else {
      // Calculate floating holiday
      let date: Date;

      switch (h.name) {
        case "Easter":
          date = calculateEaster(year);
          break;
        case "Mother's Day":
          // 2nd Sunday in May
          date = getNthWeekdayOfMonth(year, 4, 0, 2);
          break;
        case "Father's Day":
          // 3rd Sunday in June
          date = getNthWeekdayOfMonth(year, 5, 0, 3);
          break;
        case "Memorial Day":
          // Last Monday in May
          date = getNthWeekdayOfMonth(year, 4, 1, -1);
          break;
        case "Labor Day":
          // 1st Monday in September
          date = getNthWeekdayOfMonth(year, 8, 1, 1);
          break;
        case "Thanksgiving":
          // 4th Thursday in November
          date = getNthWeekdayOfMonth(year, 10, 4, 4);
          break;
        case "Thanksgiving Eve":
          // Day before Thanksgiving
          const thanksgiving = getNthWeekdayOfMonth(year, 10, 4, 4);
          date = new Date(thanksgiving);
          date.setDate(date.getDate() - 1);
          break;
        case "MLK Day":
          // 3rd Monday in January
          date = getNthWeekdayOfMonth(year, 0, 1, 3);
          break;
        case "Presidents Day":
          // 3rd Monday in February
          date = getNthWeekdayOfMonth(year, 1, 1, 3);
          break;
        case "Columbus Day":
          // 2nd Monday in October
          date = getNthWeekdayOfMonth(year, 9, 1, 2);
          break;
        case "Super Bowl Sunday":
          // Typically 2nd Sunday in February (can vary)
          date = getNthWeekdayOfMonth(year, 1, 0, 2);
          break;
        default:
          continue; // Skip unknown floating holidays
      }

      resolvedDate = formatDate(date);
    }

    holidays.push({
      name: h.name,
      date: resolvedDate,
      impactLevel: h.impactLevel,
      restaurantImpact: h.restaurantImpact,
    });
  }

  // Sort by date
  holidays.sort((a, b) => a.date.localeCompare(b.date));

  return holidays;
}

/**
 * Get holidays within a date range
 */
export function getHolidaysInRange(
  startDate: string,
  endDate: string
): ResolvedHoliday[] {
  const startYear = parseInt(startDate.slice(0, 4));
  const endYear = parseInt(endDate.slice(0, 4));

  const allHolidays: ResolvedHoliday[] = [];

  // Get holidays for each year in the range
  for (let year = startYear; year <= endYear; year++) {
    allHolidays.push(...getHolidayDates(year));
  }

  // Filter to only those in range
  return allHolidays.filter((h) => h.date >= startDate && h.date <= endDate);
}

export interface ResolvedSAEvent {
  name: string;
  month: number;
  impactLevel: "high" | "medium" | "low";
  restaurantImpact: string;
}

/**
 * Get SA recurring events that fall within a date range.
 * Returns events for any month that overlaps with the range.
 */
export function getSAEventsInRange(
  startDate: string,
  endDate: string
): ResolvedSAEvent[] {
  const startMonth = parseInt(startDate.slice(5, 7));
  const endMonth = parseInt(endDate.slice(5, 7));
  const startYear = parseInt(startDate.slice(0, 4));
  const endYear = parseInt(endDate.slice(0, 4));

  // Build list of months in the range
  const monthsInRange: number[] = [];
  if (startYear === endYear) {
    for (let m = startMonth; m <= endMonth; m++) {
      monthsInRange.push(m);
    }
  } else {
    // Spans multiple years
    for (let m = startMonth; m <= 12; m++) {
      monthsInRange.push(m);
    }
    for (let m = 1; m <= endMonth; m++) {
      if (!monthsInRange.includes(m)) {
        monthsInRange.push(m);
      }
    }
  }

  // Filter events that fall in these months
  return SA_RECURRING_EVENTS.filter((event) => {
    if (event.month) {
      return monthsInRange.includes(event.month);
    }
    if (event.months) {
      return event.months.some((m) => monthsInRange.includes(m));
    }
    return false;
  }).map((event) => ({
    name: event.name,
    month: event.month || event.months?.[0] || 1,
    impactLevel: event.impactLevel,
    restaurantImpact: event.restaurantImpact,
  }));
}

/**
 * Find the nearest holiday to a given date (within N days)
 */
export function findNearbyHoliday(
  date: string,
  maxDays: number = 3
): ResolvedHoliday | null {
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();

  // Check current year and adjacent years for edge cases
  const holidays = [
    ...getHolidayDates(year - 1),
    ...getHolidayDates(year),
    ...getHolidayDates(year + 1),
  ];

  for (const holiday of holidays) {
    const holidayDate = new Date(holiday.date);
    const diffTime = Math.abs(targetDate.getTime() - holidayDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= maxDays) {
      return holiday;
    }
  }

  return null;
}

/**
 * Get holiday context string for AI prompts
 */
export function getHolidayContext(startDate: string, endDate: string): string {
  const holidays = getHolidaysInRange(startDate, endDate);

  if (holidays.length === 0) {
    return "";
  }

  const lines = [
    "HOLIDAYS IN THIS PERIOD:",
    ...holidays.map(
      (h) =>
        `- ${h.date}: ${h.name} (${h.impactLevel} impact) — ${h.restaurantImpact}`
    ),
    "",
    "IMPORTANT: Always check if a sales anomaly falls on or near a holiday BEFORE attributing it to weather or other factors.",
    "Holidays are the most common explanation for revenue spikes.",
    "Dec 22-23 near Christmas? That's holiday demand, not weather.",
    "Feb 14 spike? Valentine's Day, not a sunny forecast.",
    "Check the calendar first, then look at weather.",
  ];

  return lines.join("\n");
}

/**
 * Get San Antonio local event context for a given month
 */
export function getSAEventContext(month: number): string {
  const events = SA_RECURRING_EVENTS.filter(
    (e) => e.month === month || e.months?.includes(month)
  );

  if (events.length === 0) {
    return "";
  }

  const lines = [
    "SAN ANTONIO LOCAL EVENTS THIS MONTH:",
    ...events.map(
      (e) => `- ${e.name} (${e.impactLevel} impact) — ${e.restaurantImpact}`
    ),
  ];

  return lines.join("\n");
}
