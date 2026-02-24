/**
 * R365 Labor Detail → Prometheus LaborDetail mapper
 */

import type { R365LaborDetail } from "../types";
import { isBackOfHouse } from "../types";
import type { DataMapper, MapperContext } from "../../types";
import type { Prisma } from "@/generated/prisma";

/**
 * Type for creating LaborDetail records
 */
export type LaborDetailCreate = Prisma.LaborDetailCreateInput;

/**
 * Intermediate labor record for aggregation
 */
interface LaborAggregateKey {
  locationId: string;
  date: string;
  positionName: string;
  positionCategory: "FOH" | "BOH";
}

interface LaborAggregateValue {
  hoursScheduled: number;
  hoursWorked: number;
  overtimeHours: number;
  laborCost: number;
  employeeIds: Set<string>;
}

/**
 * Aggregate R365 labor records by position and date
 * R365 returns per-employee records, we need per-position aggregates
 */
export function aggregateLaborByPosition(
  records: R365LaborDetail[],
  locationId: string
): Map<string, LaborAggregateValue> {
  const aggregates = new Map<string, LaborAggregateValue>();

  for (const record of records) {
    const positionName = record.JobTitle?.name ?? "Unknown";
    const positionCategory = isBackOfHouse(positionName) ? "BOH" : "FOH";
    const date = record.dateWorked.split("T")[0]; // YYYY-MM-DD

    const key = `${locationId}|${date}|${positionName}|${positionCategory}`;

    const existing = aggregates.get(key) ?? {
      hoursScheduled: 0,
      hoursWorked: 0,
      overtimeHours: 0,
      laborCost: 0,
      employeeIds: new Set<string>(),
    };

    existing.hoursScheduled += record.scheduledHours ?? 0;
    existing.hoursWorked += record.hours ?? 0;
    existing.overtimeHours += record.overtimeHours ?? 0;
    existing.laborCost += record.laborCost ?? 0;

    if (record.employee_Id) {
      existing.employeeIds.add(record.employee_Id);
    }

    aggregates.set(key, existing);
  }

  return aggregates;
}

/**
 * Parse aggregate key back to components
 */
function parseAggregateKey(key: string): LaborAggregateKey {
  const [locationId, date, positionName, positionCategory] = key.split("|");
  return {
    locationId,
    date,
    positionName,
    positionCategory: positionCategory as "FOH" | "BOH",
  };
}

/**
 * Map aggregated labor data to Prometheus LaborDetail records
 */
export function mapAggregatedLaborToLaborDetail(
  aggregates: Map<string, LaborAggregateValue>,
  context: MapperContext
): Omit<LaborDetailCreate, "location">[] {
  const results: Omit<LaborDetailCreate, "location">[] = [];

  for (const [key, value] of aggregates) {
    const parsed = parseAggregateKey(key);

    // Calculate average hourly rate
    const avgHourlyRate =
      value.hoursWorked > 0 ? value.laborCost / value.hoursWorked : 0;

    results.push({
      date: new Date(parsed.date),
      positionName: parsed.positionName,
      positionCategory: parsed.positionCategory,
      hoursScheduled: value.hoursScheduled,
      hoursWorked: value.hoursWorked,
      overtimeHours: value.overtimeHours,
      laborCost: value.laborCost,
      avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
      employeeCount: value.employeeIds.size,
    });
  }

  return results;
}

/**
 * R365 Labor Detail Mapper
 *
 * Maps individual R365 labor records to Prometheus format.
 * For aggregation by position (preferred), use aggregateLaborByPosition().
 */
export const laborMapper: DataMapper<R365LaborDetail, Omit<LaborDetailCreate, "location">> = {
  map(source: R365LaborDetail, context: MapperContext): Omit<LaborDetailCreate, "location"> {
    const positionName = source.JobTitle?.name ?? "Unknown";
    const positionCategory = isBackOfHouse(positionName) ? "BOH" : "FOH";

    const hoursWorked = source.hours ?? 0;
    const avgHourlyRate =
      hoursWorked > 0 && source.laborCost
        ? source.laborCost / hoursWorked
        : 0;

    return {
      date: new Date(source.dateWorked),
      positionName,
      positionCategory,
      hoursScheduled: source.scheduledHours ?? 0,
      hoursWorked,
      overtimeHours: source.overtimeHours ?? 0,
      laborCost: source.laborCost ?? 0,
      avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
      employeeCount: 1, // Individual record = 1 employee
    };
  },

  mapMany(
    sources: R365LaborDetail[],
    context: MapperContext
  ): Omit<LaborDetailCreate, "location">[] {
    // For bulk mapping, we aggregate by position rather than mapping individually
    const aggregates = aggregateLaborByPosition(sources, context.locationId);
    return mapAggregatedLaborToLaborDetail(aggregates, context);
  },
};

/**
 * Upsert labor detail records into the database
 */
export async function upsertLaborDetails(
  prisma: {
    laborDetail: {
      upsert: (args: {
        where: { locationId_date_positionName: { locationId: string; date: Date; positionName: string } };
        create: Prisma.LaborDetailCreateInput;
        update: Prisma.LaborDetailUpdateInput;
      }) => Promise<unknown>;
    };
  },
  locationId: string,
  records: Omit<LaborDetailCreate, "location">[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const record of records) {
    const result = await prisma.laborDetail.upsert({
      where: {
        locationId_date_positionName: {
          locationId,
          date: record.date as Date,
          positionName: record.positionName as string,
        },
      },
      create: {
        ...record,
        location: { connect: { id: locationId } },
      },
      update: {
        hoursScheduled: record.hoursScheduled,
        hoursWorked: record.hoursWorked,
        overtimeHours: record.overtimeHours,
        laborCost: record.laborCost,
        avgHourlyRate: record.avgHourlyRate,
        employeeCount: record.employeeCount,
      },
    });

    // Prisma doesn't tell us if it was create or update, count as updated if exists
    updated++;
  }

  return { created, updated };
}
