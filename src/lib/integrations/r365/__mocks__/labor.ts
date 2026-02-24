/**
 * Mock R365 Labor Data for local development
 */

import type { R365LaborDetail, R365JobTitle, R365Location } from "../types";

/**
 * Sample job titles
 */
export const mockJobTitles: R365JobTitle[] = [
  { id: "jt-001", name: "Server", code: "SRV", isActive: true },
  { id: "jt-002", name: "Bartender", code: "BAR", isActive: true },
  { id: "jt-003", name: "Host", code: "HST", isActive: true },
  { id: "jt-004", name: "Line Cook", code: "LCK", isActive: true },
  { id: "jt-005", name: "Prep Cook", code: "PCK", isActive: true },
  { id: "jt-006", name: "Dishwasher", code: "DSH", isActive: true },
  { id: "jt-007", name: "Sous Chef", code: "SCH", isActive: true },
  { id: "jt-008", name: "Head Chef", code: "HCH", isActive: true },
  { id: "jt-009", name: "Manager", code: "MGR", isActive: true },
  { id: "jt-010", name: "Expo", code: "EXP", isActive: true },
];

/**
 * Sample locations
 */
export const mockLocations: R365Location[] = [
  {
    id: "r365-loc-001",
    name: "Southerleigh Fine Food & Brewery",
    code: "SLB",
    address: "136 E Grayson St",
    city: "San Antonio",
    state: "TX",
    zipCode: "78215",
    isActive: true,
  },
  {
    id: "r365-loc-002",
    name: "Southerleigh Haute South",
    code: "SHS",
    address: "17619 La Cantera Pkwy",
    city: "San Antonio",
    state: "TX",
    zipCode: "78257",
    isActive: true,
  },
  {
    id: "r365-loc-003",
    name: "Brasserie Mon Chou Chou",
    code: "MCC",
    address: "312 Pearl Pkwy",
    city: "San Antonio",
    state: "TX",
    zipCode: "78215",
    isActive: true,
  },
  {
    id: "r365-loc-004",
    name: "BoilerHouse Texas Grill",
    code: "BLH",
    address: "312 Pearl Pkwy Bldg 3",
    city: "San Antonio",
    state: "TX",
    zipCode: "78215",
    isActive: true,
  },
];

/**
 * Generate mock labor detail records for a date range
 */
export function generateMockLaborDetail(
  startDate: Date,
  endDate: Date,
  locationId: string = "r365-loc-001"
): R365LaborDetail[] {
  const records: R365LaborDetail[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    // Generate records for each position
    for (const jobTitle of mockJobTitles) {
      // More staff on weekends
      const staffCount = isWeekend ? 3 : 2;

      for (let i = 0; i < staffCount; i++) {
        const baseHours = getBaseHours(jobTitle.name, isWeekend);
        const overtime = Math.random() > 0.8 ? Math.random() * 2 : 0;
        const hourlyRate = getHourlyRate(jobTitle.name);
        const actualHours = baseHours + (Math.random() - 0.5) * 2;

        records.push({
          id: `ld-${dateStr}-${jobTitle.id}-${i}`,
          dateWorked: `${dateStr}T00:00:00Z`,
          employee_Id: `emp-${jobTitle.code}-${i}`,
          jobTitle_Id: jobTitle.id,
          location_Id: locationId,
          scheduledHours: baseHours,
          hours: Math.round(actualHours * 100) / 100,
          overtimeHours: Math.round(overtime * 100) / 100,
          regularHours: Math.round((actualHours - overtime) * 100) / 100,
          laborCost: Math.round((actualHours * hourlyRate + overtime * hourlyRate * 1.5) * 100) / 100,
          regularPay: Math.round((actualHours - overtime) * hourlyRate * 100) / 100,
          overtimePay: Math.round(overtime * hourlyRate * 1.5 * 100) / 100,
          JobTitle: jobTitle,
          Location: mockLocations.find((l) => l.id === locationId),
        });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return records;
}

/**
 * Get base hours by position
 */
function getBaseHours(position: string, isWeekend: boolean): number {
  const baseMap: Record<string, number> = {
    Server: 6,
    Bartender: 7,
    Host: 5,
    "Line Cook": 8,
    "Prep Cook": 6,
    Dishwasher: 6,
    "Sous Chef": 9,
    "Head Chef": 10,
    Manager: 8,
    Expo: 6,
  };

  const base = baseMap[position] ?? 6;
  return isWeekend ? base * 1.2 : base;
}

/**
 * Get hourly rate by position
 */
function getHourlyRate(position: string): number {
  const rateMap: Record<string, number> = {
    Server: 12,
    Bartender: 14,
    Host: 11,
    "Line Cook": 16,
    "Prep Cook": 14,
    Dishwasher: 12,
    "Sous Chef": 22,
    "Head Chef": 28,
    Manager: 25,
    Expo: 13,
  };

  return rateMap[position] ?? 12;
}

/**
 * Create mock OData response wrapper
 */
export function wrapInODataResponse<T>(data: T[]): {
  "@odata.context": string;
  value: T[];
} {
  return {
    "@odata.context": "https://odata.restaurant365.net/api/v2/views/$metadata",
    value: data,
  };
}
