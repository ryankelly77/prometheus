/**
 * Toast Labor Mapper
 *
 * Maps Toast time entries to LaborDetail records.
 */

import type { Prisma, PositionCategory } from "@/generated/prisma";
import type { ToastTimeEntry } from "../types";
import { parseBusinessDate } from "./orders";

// Keywords to identify BOH positions
const BOH_POSITION_KEYWORDS = [
  "chef",
  "cook",
  "line cook",
  "prep cook",
  "prep",
  "dishwasher",
  "dish",
  "kitchen",
  "sous",
  "pastry",
  "baker",
  "expeditor",
  "expo",
  "grill",
  "fry",
  "sautee",
  "garde manger",
  "pantry",
  "steward",
];

// Keywords to identify FOH positions
const FOH_POSITION_KEYWORDS = [
  "server",
  "waiter",
  "waitress",
  "host",
  "hostess",
  "bartender",
  "bar",
  "barback",
  "busser",
  "busboy",
  "runner",
  "food runner",
  "cashier",
  "manager",
  "maitre",
  "sommelier",
  "greeter",
  "captain",
  "service",
];

/**
 * Determine position category from job title/code
 */
export function categorizePosition(
  jobTitle?: string,
  jobCode?: string
): PositionCategory {
  const searchText = `${jobTitle ?? ""} ${jobCode ?? ""}`.toLowerCase();

  // Check BOH keywords first
  for (const keyword of BOH_POSITION_KEYWORDS) {
    if (searchText.includes(keyword)) {
      return "BOH";
    }
  }

  // Check FOH keywords
  for (const keyword of FOH_POSITION_KEYWORDS) {
    if (searchText.includes(keyword)) {
      return "FOH";
    }
  }

  // Default to FOH if unsure
  return "FOH";
}

// Aggregated labor data by position and date
interface LaborAggregate {
  date: Date;
  positionName: string;
  positionCategory: PositionCategory;
  hoursWorked: number;
  laborCost: number;
  overtimeHours: number;
  employeeCount: Set<string>;
}

/**
 * Aggregate time entries by position and date
 */
export function aggregateTimeEntriesByPosition(
  timeEntries: ToastTimeEntry[]
): Map<string, LaborAggregate> {
  const aggregates = new Map<string, LaborAggregate>();

  for (const entry of timeEntries) {
    // Skip deleted entries
    if (entry.deleted) continue;

    // Skip entries without out date (still clocked in)
    if (!entry.outDate) continue;

    const date = parseBusinessDate(entry.businessDate);
    const positionName = entry.jobTitle || "Unknown";
    const key = `${date.toISOString().slice(0, 10)}-${positionName}`;

    const existing = aggregates.get(key) ?? {
      date,
      positionName,
      positionCategory: categorizePosition(entry.jobTitle, entry.jobCode),
      hoursWorked: 0,
      laborCost: 0,
      overtimeHours: 0,
      employeeCount: new Set<string>(),
    };

    existing.hoursWorked += entry.regularHours + entry.overtimeHours;
    existing.laborCost += entry.totalWages;
    existing.overtimeHours += entry.overtimeHours;
    existing.employeeCount.add(entry.employeeGuid);

    aggregates.set(key, existing);
  }

  return aggregates;
}

/**
 * Map aggregated labor data to Prisma create inputs
 */
export function mapLaborAggregatesToPrisma(
  aggregates: Map<string, LaborAggregate>,
  locationId: string
): Prisma.LaborDetailCreateManyInput[] {
  const records: Prisma.LaborDetailCreateManyInput[] = [];

  for (const [_, agg] of aggregates) {
    records.push({
      locationId,
      date: agg.date,
      positionName: agg.positionName,
      positionCategory: agg.positionCategory,
      hoursWorked: agg.hoursWorked,
      laborCost: agg.laborCost,
      overtimeHours: agg.overtimeHours,
      employeeCount: agg.employeeCount.size,
    });
  }

  return records;
}

/**
 * Calculate daily labor totals for a location
 */
export function calculateDailyLaborTotals(
  aggregates: Map<string, LaborAggregate>
): Map<string, { totalHours: number; totalCost: number; fohHours: number; bohHours: number }> {
  const dailyTotals = new Map<
    string,
    { totalHours: number; totalCost: number; fohHours: number; bohHours: number }
  >();

  for (const [_, agg] of aggregates) {
    const dateKey = agg.date.toISOString().slice(0, 10);

    const existing = dailyTotals.get(dateKey) ?? {
      totalHours: 0,
      totalCost: 0,
      fohHours: 0,
      bohHours: 0,
    };

    existing.totalHours += agg.hoursWorked;
    existing.totalCost += agg.laborCost;

    if (agg.positionCategory === "FOH") {
      existing.fohHours += agg.hoursWorked;
    } else {
      existing.bohHours += agg.hoursWorked;
    }

    dailyTotals.set(dateKey, existing);
  }

  return dailyTotals;
}

/**
 * Map a single time entry to a labor record
 */
export function mapTimeEntryToRecord(
  entry: ToastTimeEntry,
  locationId: string
): Prisma.LaborDetailCreateInput {
  return {
    location: { connect: { id: locationId } },
    date: parseBusinessDate(entry.businessDate),
    positionName: entry.jobTitle || "Unknown",
    positionCategory: categorizePosition(entry.jobTitle, entry.jobCode),
    hoursWorked: entry.regularHours + entry.overtimeHours,
    laborCost: entry.totalWages,
    overtimeHours: entry.overtimeHours,
    employeeCount: 1,
  };
}
