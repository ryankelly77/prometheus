/**
 * Weather-Sales Correlation Analysis
 *
 * Analyzes how weather impacts restaurant sales by joining daily weather
 * with transaction data. Uses day-of-week adjustment for accurate comparisons.
 * Ranks weather drivers by actual revenue impact, not assumptions.
 */

import prisma from "@/lib/prisma";
import { findNearbyHoliday, getHolidayContext, getSAEventContext } from "@/lib/data/holidays";
import { aggregateStaticEvents, type NormalizedEvent } from "@/lib/events/aggregator";

// =============================================================================
// Types
// =============================================================================

export interface WeatherDriver {
  factor: string; // 'extreme_heat', 'rain', 'extreme_cold', 'severe_weather'
  label: string; // 'Extreme Heat (>95°F)', 'Rain', etc.
  impactPct: number; // DOW-adjusted impact percentage
  daysAffected: number; // how many days in the analysis period
  estimatedAnnualLoss: number; // projected annual revenue impact
  rank: number; // 1 = biggest impact
}

export interface OutdoorImpact {
  hasOutdoorSeating: boolean;
  outdoorRevenueCenters: string[];
  annualOutdoorPct: number | null;        // e.g., 21.6%

  // Seasonal pattern (real data from revenue centers)
  springAvgDaily: number | null;           // Mar-Apr avg
  summerAvgDaily: number | null;           // Jun-Aug avg
  fallAvgDaily: number | null;             // Oct-Nov avg
  winterAvgDaily: number | null;           // Dec-Feb avg

  peakMonth: string | null;                // e.g., "April"
  peakOutdoorPct: number | null;           // e.g., 30.1%
  troughMonth: string | null;              // e.g., "August"
  troughOutdoorPct: number | null;         // e.g., 9.3%

  summerDeclinePct: number | null;         // % decline from spring to summer
  estimatedSummerLoss: number | null;      // dollar amount lost to summer heat

  // Legacy fields
  heatImpactOnOutdoor: number | null;
  note: string;
}

export interface WeatherCorrelation {
  // Period info
  periodStart: string;
  periodEnd: string;
  totalDaysAnalyzed: number;
  avgDailyRevenue: number;

  // Ranked weather drivers (sorted by estimated annual loss)
  weatherDrivers: WeatherDriver[];

  // Rain impact
  rainyDayAvgSales: number;
  normalDayAvgSales: number;
  rainImpactPct: number; // e.g. -18%
  rainyDayCount: number;
  estimatedRainLoss: number; // total $ lost to rain over period

  // Temperature impact
  tempSweetSpot: { min: number; max: number }; // temp range with highest avg sales
  extremeHeatAvgSales: number;
  extremeHeatImpactPct: number;
  extremeHeatDayCount: number;
  extremeColdAvgSales: number;
  extremeColdImpactPct: number;
  extremeColdDayCount: number;

  // Severe weather
  severeWeatherDays: {
    date: string;
    description: string;
    sales: number;
    expectedSales: number;
    impactPct: number;
  }[];
  adjustedSevereWeatherImpactPct: number;

  // Day-of-week adjusted (important!)
  // Raw comparison is misleading if rainy days happen to fall on slow days
  // This compares rainy Tuesdays to normal Tuesdays, etc.
  adjustedRainImpactPct: number;
  adjustedExtremeHeatImpactPct: number;
  adjustedExtremeColdImpactPct: number;

  // Outdoor seating impact
  outdoorImpact: OutdoorImpact | null;

  // Anomalies explained by weather, holidays, or local events
  weatherExplainedAnomalies: {
    date: string;
    dayOfWeek: string;
    sales: number;
    expectedSales: number;
    pctDiff: number;
    weatherDescription: string;
    tempHigh: number;
    precipitation: number;
    explanation: string;
    // Holiday context
    nearbyHoliday?: string;
    likelyHolidayDriven?: boolean;
    // Event context (non-holiday events like concerts, sports, festivals)
    nearbyEvent?: string;
    likelyEventDriven?: boolean;
  }[];
}

interface DailyData {
  date: Date;
  dateStr: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  dayName: string;
  sales: number;
  // Weather
  tempHigh: number | null;
  tempLow: number | null;
  precipitation: number | null;
  weatherDescription: string | null;
  isRainy: boolean;
  isExtremeHeat: boolean;
  isExtremeCold: boolean;
  isSevereWeather: boolean;
}

// =============================================================================
// Main Analysis Function
// =============================================================================

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function analyzeWeatherCorrelations(
  locationId: string,
  startDate?: string,
  endDate?: string
): Promise<WeatherCorrelation> {
  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  // Default to last 12 months if no dates specified
  if (!startDate && !endDate) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    dateFilter.gte = twelveMonthsAgo;
  }

  // Fetch transaction summaries
  const transactions = await prisma.transactionSummary.findMany({
    where: {
      locationId,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    },
    orderBy: { date: "asc" },
  });

  // Fetch weather data for the same period
  const weather = await prisma.weatherData.findMany({
    where: {
      locationId,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    },
    orderBy: { date: "asc" },
  });

  // Create a map of weather by date
  const weatherByDate = new Map<string, (typeof weather)[0]>();
  for (const w of weather) {
    const dateStr = w.date.toISOString().slice(0, 10);
    weatherByDate.set(dateStr, w);
  }

  // Join transaction data with weather data
  const dailyData: DailyData[] = [];

  for (const tx of transactions) {
    const dateStr = tx.date.toISOString().slice(0, 10);
    const weatherDay = weatherByDate.get(dateStr);
    const dayOfWeek = tx.date.getDay();

    dailyData.push({
      date: tx.date,
      dateStr,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      sales: Number(tx.netSales),
      tempHigh: weatherDay?.tempHigh ?? null,
      tempLow: weatherDay?.tempLow ?? null,
      precipitation: weatherDay?.precipitation ?? null,
      weatherDescription: weatherDay?.weatherDescription ?? null,
      isRainy: weatherDay?.isRainy ?? false,
      isExtremeHeat: weatherDay?.isExtremeHeat ?? false,
      isExtremeCold: weatherDay?.isExtremeCold ?? false,
      isSevereWeather: weatherDay?.isSevereWeather ?? false,
    });
  }

  if (dailyData.length === 0) {
    return createEmptyResult();
  }

  // Calculate DOW averages for normal weather days (baseline)
  const dowAverages = calculateDOWAverages(dailyData);

  // Calculate rain impact
  const rainAnalysis = analyzeRainImpact(dailyData, dowAverages);

  // Calculate temperature impact
  const tempAnalysis = analyzeTemperatureImpact(dailyData, dowAverages);

  // Find severe weather days
  const severeWeatherDays = findSevereWeatherDays(dailyData, dowAverages);

  // Find weather-explained anomalies
  const anomalies = findWeatherExplainedAnomalies(dailyData, dowAverages);

  // Get period bounds
  const periodStart = dailyData[0].dateStr;
  const periodEnd = dailyData[dailyData.length - 1].dateStr;

  // Calculate average daily revenue
  const totalRevenue = dailyData.reduce((sum, d) => sum + d.sales, 0);
  const avgDailyRevenue = dailyData.length > 0 ? totalRevenue / dailyData.length : 0;

  // Calculate severe weather DOW-adjusted impact
  const severeDays = dailyData.filter((d) => d.isSevereWeather);
  let totalSevereDiff = 0;
  let severeCount = 0;
  for (const day of severeDays) {
    const expected = dowAverages.get(day.dayOfWeek) || avgDailyRevenue;
    if (expected > 0) {
      totalSevereDiff += ((day.sales - expected) / expected) * 100;
      severeCount++;
    }
  }
  const adjustedSevereWeatherImpactPct = severeCount > 0 ? totalSevereDiff / severeCount : 0;

  // Annualize days (scale from analysis period to full year)
  const daysInPeriod = dailyData.length;
  const annualizationFactor = daysInPeriod > 0 ? 365 / daysInPeriod : 1;

  // Build ranked weather drivers by estimated annual loss
  const weatherDrivers = buildWeatherDrivers({
    rainImpactPct: rainAnalysis.adjustedRainImpactPct,
    rainyDayCount: rainAnalysis.rainyDayCount,
    extremeHeatImpactPct: tempAnalysis.adjustedExtremeHeatImpactPct,
    extremeHeatDayCount: tempAnalysis.extremeHeatDayCount,
    extremeColdImpactPct: tempAnalysis.adjustedExtremeColdImpactPct,
    extremeColdDayCount: tempAnalysis.extremeColdDayCount,
    severeWeatherImpactPct: adjustedSevereWeatherImpactPct,
    severeWeatherDayCount: severeDays.length,
    avgDailyRevenue,
    annualizationFactor,
  });

  // Check for outdoor seating (Task 2)
  const outdoorImpact = await analyzeOutdoorImpact(locationId, tempAnalysis.adjustedExtremeHeatImpactPct);

  return {
    periodStart,
    periodEnd,
    totalDaysAnalyzed: dailyData.length,
    avgDailyRevenue: Math.round(avgDailyRevenue),
    weatherDrivers,

    // Rain impact
    rainyDayAvgSales: rainAnalysis.rainyDayAvgSales,
    normalDayAvgSales: rainAnalysis.normalDayAvgSales,
    rainImpactPct: rainAnalysis.rainImpactPct,
    rainyDayCount: rainAnalysis.rainyDayCount,
    estimatedRainLoss: rainAnalysis.estimatedRainLoss,
    adjustedRainImpactPct: rainAnalysis.adjustedRainImpactPct,

    // Temperature impact
    tempSweetSpot: tempAnalysis.tempSweetSpot,
    extremeHeatAvgSales: tempAnalysis.extremeHeatAvgSales,
    extremeHeatImpactPct: tempAnalysis.extremeHeatImpactPct,
    extremeHeatDayCount: tempAnalysis.extremeHeatDayCount,
    extremeColdAvgSales: tempAnalysis.extremeColdAvgSales,
    extremeColdImpactPct: tempAnalysis.extremeColdImpactPct,
    extremeColdDayCount: tempAnalysis.extremeColdDayCount,
    adjustedExtremeHeatImpactPct: tempAnalysis.adjustedExtremeHeatImpactPct,
    adjustedExtremeColdImpactPct: tempAnalysis.adjustedExtremeColdImpactPct,

    // Severe weather
    severeWeatherDays,
    adjustedSevereWeatherImpactPct: Math.round(adjustedSevereWeatherImpactPct * 10) / 10,

    // Outdoor impact
    outdoorImpact,

    // Anomalies
    weatherExplainedAnomalies: anomalies,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function createEmptyResult(): WeatherCorrelation {
  return {
    periodStart: "",
    periodEnd: "",
    totalDaysAnalyzed: 0,
    avgDailyRevenue: 0,
    weatherDrivers: [],
    rainyDayAvgSales: 0,
    normalDayAvgSales: 0,
    rainImpactPct: 0,
    rainyDayCount: 0,
    estimatedRainLoss: 0,
    tempSweetSpot: { min: 0, max: 0 },
    extremeHeatAvgSales: 0,
    extremeHeatImpactPct: 0,
    extremeHeatDayCount: 0,
    extremeColdAvgSales: 0,
    extremeColdImpactPct: 0,
    extremeColdDayCount: 0,
    severeWeatherDays: [],
    adjustedSevereWeatherImpactPct: 0,
    adjustedRainImpactPct: 0,
    adjustedExtremeHeatImpactPct: 0,
    adjustedExtremeColdImpactPct: 0,
    outdoorImpact: null,
    weatherExplainedAnomalies: [],
  };
}

/**
 * Calculate day-of-week averages for "normal" weather days
 * (no rain, no extreme temps, no severe weather)
 */
function calculateDOWAverages(data: DailyData[]): Map<number, number> {
  const dowTotals = new Map<number, { total: number; count: number }>();

  for (const day of data) {
    // Only include normal weather days in baseline
    if (day.isRainy || day.isExtremeHeat || day.isExtremeCold || day.isSevereWeather) {
      continue;
    }

    const existing = dowTotals.get(day.dayOfWeek) || { total: 0, count: 0 };
    existing.total += day.sales;
    existing.count += 1;
    dowTotals.set(day.dayOfWeek, existing);
  }

  const averages = new Map<number, number>();
  for (const [dow, data] of dowTotals) {
    averages.set(dow, data.count > 0 ? data.total / data.count : 0);
  }

  return averages;
}

/**
 * Analyze rain impact on sales with DOW adjustment
 */
function analyzeRainImpact(
  data: DailyData[],
  dowAverages: Map<number, number>
): {
  rainyDayAvgSales: number;
  normalDayAvgSales: number;
  rainImpactPct: number;
  rainyDayCount: number;
  estimatedRainLoss: number;
  adjustedRainImpactPct: number;
} {
  const rainyDays = data.filter((d) => d.isRainy);
  const normalDays = data.filter(
    (d) => !d.isRainy && !d.isExtremeHeat && !d.isExtremeCold && !d.isSevereWeather
  );

  const rainyDayAvgSales =
    rainyDays.length > 0
      ? rainyDays.reduce((sum, d) => sum + d.sales, 0) / rainyDays.length
      : 0;

  const normalDayAvgSales =
    normalDays.length > 0
      ? normalDays.reduce((sum, d) => sum + d.sales, 0) / normalDays.length
      : 0;

  // Raw impact (not DOW adjusted)
  const rainImpactPct =
    normalDayAvgSales > 0
      ? ((rainyDayAvgSales - normalDayAvgSales) / normalDayAvgSales) * 100
      : 0;

  // DOW-adjusted impact
  // Compare each rainy day to the average for that day of week
  let totalAdjustedDiff = 0;
  let adjustedCount = 0;

  for (const day of rainyDays) {
    const expectedSales = dowAverages.get(day.dayOfWeek) || normalDayAvgSales;
    if (expectedSales > 0) {
      const pctDiff = ((day.sales - expectedSales) / expectedSales) * 100;
      totalAdjustedDiff += pctDiff;
      adjustedCount++;
    }
  }

  const adjustedRainImpactPct = adjustedCount > 0 ? totalAdjustedDiff / adjustedCount : 0;

  // Estimate total rain loss
  let estimatedRainLoss = 0;
  for (const day of rainyDays) {
    const expectedSales = dowAverages.get(day.dayOfWeek) || normalDayAvgSales;
    if (day.sales < expectedSales) {
      estimatedRainLoss += expectedSales - day.sales;
    }
  }

  return {
    rainyDayAvgSales: Math.round(rainyDayAvgSales),
    normalDayAvgSales: Math.round(normalDayAvgSales),
    rainImpactPct: Math.round(rainImpactPct * 10) / 10,
    rainyDayCount: rainyDays.length,
    estimatedRainLoss: Math.round(estimatedRainLoss),
    adjustedRainImpactPct: Math.round(adjustedRainImpactPct * 10) / 10,
  };
}

/**
 * Analyze temperature impact on sales
 */
function analyzeTemperatureImpact(
  data: DailyData[],
  dowAverages: Map<number, number>
): {
  tempSweetSpot: { min: number; max: number };
  extremeHeatAvgSales: number;
  extremeHeatImpactPct: number;
  extremeHeatDayCount: number;
  extremeColdAvgSales: number;
  extremeColdImpactPct: number;
  extremeColdDayCount: number;
  adjustedExtremeHeatImpactPct: number;
  adjustedExtremeColdImpactPct: number;
} {
  // Filter to days with temperature data
  const daysWithTemp = data.filter((d) => d.tempHigh !== null);

  // Find temperature sweet spot by bucketing
  // Buckets: <50, 50-59, 60-69, 70-79, 80-89, 90+
  const tempBuckets = new Map<string, { total: number; count: number }>();
  const bucketRanges = [
    { label: "<50", min: -100, max: 50 },
    { label: "50-59", min: 50, max: 60 },
    { label: "60-69", min: 60, max: 70 },
    { label: "70-79", min: 70, max: 80 },
    { label: "80-89", min: 80, max: 90 },
    { label: "90+", min: 90, max: 200 },
  ];

  for (const day of daysWithTemp) {
    if (day.tempHigh === null) continue;

    for (const bucket of bucketRanges) {
      if (day.tempHigh >= bucket.min && day.tempHigh < bucket.max) {
        const existing = tempBuckets.get(bucket.label) || { total: 0, count: 0 };
        existing.total += day.sales;
        existing.count += 1;
        tempBuckets.set(bucket.label, existing);
        break;
      }
    }
  }

  // Find bucket with highest average sales
  let bestBucket = { label: "70-79", avg: 0 };
  for (const [label, data] of tempBuckets) {
    const avg = data.count > 0 ? data.total / data.count : 0;
    if (avg > bestBucket.avg) {
      bestBucket = { label, avg };
    }
  }

  const sweetSpotRange = bucketRanges.find((b) => b.label === bestBucket.label) || {
    min: 70,
    max: 80,
  };

  // Calculate overall average for comparison
  const overallAvg =
    daysWithTemp.length > 0
      ? daysWithTemp.reduce((sum, d) => sum + d.sales, 0) / daysWithTemp.length
      : 0;

  // Extreme heat analysis
  const extremeHeatDays = data.filter((d) => d.isExtremeHeat);
  const extremeHeatAvgSales =
    extremeHeatDays.length > 0
      ? extremeHeatDays.reduce((sum, d) => sum + d.sales, 0) / extremeHeatDays.length
      : 0;
  const extremeHeatImpactPct =
    overallAvg > 0 ? ((extremeHeatAvgSales - overallAvg) / overallAvg) * 100 : 0;

  // DOW-adjusted extreme heat impact
  let totalHeatDiff = 0;
  let heatCount = 0;
  for (const day of extremeHeatDays) {
    const expected = dowAverages.get(day.dayOfWeek) || overallAvg;
    if (expected > 0) {
      totalHeatDiff += ((day.sales - expected) / expected) * 100;
      heatCount++;
    }
  }
  const adjustedExtremeHeatImpactPct = heatCount > 0 ? totalHeatDiff / heatCount : 0;

  // Extreme cold analysis
  const extremeColdDays = data.filter((d) => d.isExtremeCold);
  const extremeColdAvgSales =
    extremeColdDays.length > 0
      ? extremeColdDays.reduce((sum, d) => sum + d.sales, 0) / extremeColdDays.length
      : 0;
  const extremeColdImpactPct =
    overallAvg > 0 ? ((extremeColdAvgSales - overallAvg) / overallAvg) * 100 : 0;

  // DOW-adjusted extreme cold impact
  let totalColdDiff = 0;
  let coldCount = 0;
  for (const day of extremeColdDays) {
    const expected = dowAverages.get(day.dayOfWeek) || overallAvg;
    if (expected > 0) {
      totalColdDiff += ((day.sales - expected) / expected) * 100;
      coldCount++;
    }
  }
  const adjustedExtremeColdImpactPct = coldCount > 0 ? totalColdDiff / coldCount : 0;

  return {
    tempSweetSpot: { min: sweetSpotRange.min, max: sweetSpotRange.max },
    extremeHeatAvgSales: Math.round(extremeHeatAvgSales),
    extremeHeatImpactPct: Math.round(extremeHeatImpactPct * 10) / 10,
    extremeHeatDayCount: extremeHeatDays.length,
    extremeColdAvgSales: Math.round(extremeColdAvgSales),
    extremeColdImpactPct: Math.round(extremeColdImpactPct * 10) / 10,
    extremeColdDayCount: extremeColdDays.length,
    adjustedExtremeHeatImpactPct: Math.round(adjustedExtremeHeatImpactPct * 10) / 10,
    adjustedExtremeColdImpactPct: Math.round(adjustedExtremeColdImpactPct * 10) / 10,
  };
}

/**
 * Find days with severe weather and their sales impact
 */
function findSevereWeatherDays(
  data: DailyData[],
  dowAverages: Map<number, number>
): WeatherCorrelation["severeWeatherDays"] {
  const severeDays = data.filter((d) => d.isSevereWeather);

  return severeDays.map((day) => {
    const expectedSales = dowAverages.get(day.dayOfWeek) || 0;
    const impactPct = expectedSales > 0 ? ((day.sales - expectedSales) / expectedSales) * 100 : 0;

    return {
      date: day.dateStr,
      description: day.weatherDescription || "Severe weather",
      sales: Math.round(day.sales),
      expectedSales: Math.round(expectedSales),
      impactPct: Math.round(impactPct * 10) / 10,
    };
  });
}

/**
 * Find sales anomalies that can be explained by weather, holidays, or local events
 * An anomaly is when actual sales differ from DOW average by >20%
 *
 * PRIORITY ORDER:
 * 1. Holidays (Valentine's Day, etc.) — most reliable explanation for spikes
 * 2. Local Events (concerts, sports, festivals) — second most common
 * 3. Weather (rain, extreme temps) — third, after ruling out events
 */
function findWeatherExplainedAnomalies(
  data: DailyData[],
  dowAverages: Map<number, number>
): WeatherCorrelation["weatherExplainedAnomalies"] {
  const anomalies: WeatherCorrelation["weatherExplainedAnomalies"] = [];
  const ANOMALY_THRESHOLD = 20; // 20% deviation from expected

  // Get date range from data for event lookup
  if (data.length === 0) return anomalies;
  const startDate = data[0].dateStr;
  const endDate = data[data.length - 1].dateStr;

  // Fetch all events for the analysis period (holidays, school calendar, SA events)
  let events: NormalizedEvent[] = [];
  try {
    events = aggregateStaticEvents(startDate, endDate);
  } catch (err) {
    console.log("[Correlations] Event fetch failed, continuing without:", err);
  }

  // Build a map of events by date for quick lookup
  const eventsByDate = new Map<string, NormalizedEvent[]>();
  for (const event of events) {
    const existing = eventsByDate.get(event.date) || [];
    existing.push(event);
    eventsByDate.set(event.date, existing);

    // Also map multi-day events
    if (event.endDate && event.endDate !== event.date) {
      const start = new Date(event.date);
      const end = new Date(event.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const dayEvents = eventsByDate.get(dateStr) || [];
        if (!dayEvents.some(e => e.name === event.name)) {
          dayEvents.push(event);
          eventsByDate.set(dateStr, dayEvents);
        }
      }
    }
  }

  for (const day of data) {
    const expectedSales = dowAverages.get(day.dayOfWeek);
    if (!expectedSales || expectedSales === 0) continue;

    const pctDiff = ((day.sales - expectedSales) / expectedSales) * 100;

    // Only consider significant deviations
    if (Math.abs(pctDiff) < ANOMALY_THRESHOLD) continue;

    // Check for nearby holiday FIRST — holidays are the #1 explanation for spikes
    const nearbyHoliday = findNearbyHoliday(day.dateStr, 3);
    const likelyHolidayDriven = nearbyHoliday !== null && pctDiff > 0;

    // Check for local events on this day (non-holiday events like concerts, sports, festivals)
    const dayEvents = eventsByDate.get(day.dateStr)?.filter(
      e => e.source !== "US_HOLIDAYS" && e.impactLevel !== "low"
    ) || [];
    const likelyEventDriven = dayEvents.length > 0 && pctDiff > 0;
    const nearbyEventName = dayEvents.length > 0
      ? dayEvents.map(e => e.name).join(", ")
      : undefined;

    // Build explanation — prioritize holiday, then events, then weather
    let explanation = "";

    if (likelyHolidayDriven && nearbyHoliday) {
      // Holiday is the primary driver
      explanation = `Near ${nearbyHoliday.name} (${nearbyHoliday.impactLevel} impact holiday)`;

      // Weather as secondary context if favorable
      if (day.tempHigh !== null && day.tempHigh >= 70 && day.tempHigh <= 85) {
        explanation += `. Weather: ${day.tempHigh}°F (favorable)`;
      }
    } else if (likelyEventDriven && dayEvents.length > 0) {
      // Local event is the primary driver
      const topEvent = dayEvents[0];
      explanation = `${topEvent.name} [${topEvent.category}/${topEvent.impactLevel}]`;
      if (topEvent.impactNote) {
        explanation += ` — ${topEvent.impactNote}`;
      }
    } else if (day.isSevereWeather) {
      explanation = `Severe weather: ${day.weatherDescription}`;
    } else if (day.isRainy && pctDiff < 0) {
      explanation = `Rain day: ${day.precipitation?.toFixed(1) || "?"}" precipitation`;
    } else if (day.isExtremeHeat && pctDiff < 0) {
      explanation = `Extreme heat: ${day.tempHigh}°F high`;
    } else if (day.isExtremeCold) {
      explanation = `Extreme cold: ${day.tempLow}°F low`;
    } else if (day.tempHigh !== null && day.tempHigh >= 70 && day.tempHigh <= 85 && pctDiff > 0) {
      // Perfect weather, but check for events or holidays
      if (nearbyHoliday) {
        explanation = `Near ${nearbyHoliday.name}. Weather: ${day.tempHigh}°F (also favorable)`;
      } else if (dayEvents.length > 0) {
        explanation = `${dayEvents[0].name}. Weather: ${day.tempHigh}°F (also favorable)`;
      } else {
        explanation = `Perfect weather: ${day.tempHigh}°F, ${day.weatherDescription || "clear"}`;
      }
    } else if (nearbyHoliday && pctDiff < 0) {
      // Negative anomaly near holiday (maybe day after?)
      explanation = `Near ${nearbyHoliday.name} (post-holiday dip?)`;
    } else if (dayEvents.length > 0 && pctDiff < 0) {
      // Negative anomaly on event day (maybe post-event hangover?)
      explanation = `Day of ${dayEvents[0].name} (possible traffic disruption or post-event dip)`;
    }

    // Include if we can explain it with weather, holiday, OR event
    if (explanation) {
      anomalies.push({
        date: day.dateStr,
        dayOfWeek: day.dayName,
        sales: Math.round(day.sales),
        expectedSales: Math.round(expectedSales),
        pctDiff: Math.round(pctDiff * 10) / 10,
        weatherDescription: day.weatherDescription || "Unknown",
        tempHigh: day.tempHigh || 0,
        precipitation: day.precipitation || 0,
        explanation,
        nearbyHoliday: nearbyHoliday?.name,
        likelyHolidayDriven,
        nearbyEvent: nearbyEventName,
        likelyEventDriven,
      });
    }
  }

  // Sort by absolute impact (most significant first)
  anomalies.sort((a, b) => Math.abs(b.pctDiff) - Math.abs(a.pctDiff));

  // Return top 10 anomalies
  return anomalies.slice(0, 10);
}

/**
 * Build and rank weather drivers by estimated annual loss
 * This surfaces the REAL driver — not just the biggest % but the most total damage
 */
function buildWeatherDrivers(params: {
  rainImpactPct: number;
  rainyDayCount: number;
  extremeHeatImpactPct: number;
  extremeHeatDayCount: number;
  extremeColdImpactPct: number;
  extremeColdDayCount: number;
  severeWeatherImpactPct: number;
  severeWeatherDayCount: number;
  avgDailyRevenue: number;
  annualizationFactor: number;
}): WeatherDriver[] {
  const drivers: WeatherDriver[] = [];

  // Only include drivers with negative impact and at least 1 day affected
  const addDriver = (
    factor: string,
    label: string,
    impactPct: number,
    daysAffected: number
  ) => {
    if (impactPct < 0 && daysAffected > 0) {
      // Annualize the days affected
      const annualDays = Math.round(daysAffected * params.annualizationFactor);
      // Estimated annual loss = |impact%| × days × avg daily revenue
      const estimatedAnnualLoss = Math.round(
        Math.abs(impactPct / 100) * annualDays * params.avgDailyRevenue
      );
      drivers.push({
        factor,
        label,
        impactPct: Math.round(impactPct * 10) / 10,
        daysAffected: annualDays,
        estimatedAnnualLoss,
        rank: 0, // Will be set after sorting
      });
    }
  };

  addDriver("rain", "Rain", params.rainImpactPct, params.rainyDayCount);
  addDriver("extreme_heat", "Extreme Heat (>95°F)", params.extremeHeatImpactPct, params.extremeHeatDayCount);
  addDriver("extreme_cold", "Extreme Cold (<32°F)", params.extremeColdImpactPct, params.extremeColdDayCount);
  addDriver("severe_weather", "Severe Weather", params.severeWeatherImpactPct, params.severeWeatherDayCount);

  // Sort by estimated annual loss (highest first)
  drivers.sort((a, b) => b.estimatedAnnualLoss - a.estimatedAnnualLoss);

  // Assign ranks
  drivers.forEach((driver, index) => {
    driver.rank = index + 1;
  });

  return drivers;
}

/**
 * Analyze outdoor seating impact using REAL revenue center data
 * Calculates seasonal patterns to show the heat story with actual numbers
 */
async function analyzeOutdoorImpact(
  locationId: string,
  overallHeatImpact: number
): Promise<OutdoorImpact | null> {
  // Get outdoor revenue center data (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const outdoorMetrics = await prisma.revenueCenterMetrics.findMany({
    where: {
      locationId,
      isOutdoor: true,
      date: { gte: twelveMonthsAgo },
    },
    select: {
      date: true,
      revenueCenterName: true,
      netSales: true,
    },
  });

  if (outdoorMetrics.length === 0) {
    // Fall back to checking SeatingArea table if no revenue center data
    const outdoorAreas = await prisma.seatingArea.findMany({
      where: {
        locationId,
        OR: [
          { isOutdoor: true },
          { weatherDependent: true },
          { name: { contains: "outdoor", mode: "insensitive" } },
          { name: { contains: "patio", mode: "insensitive" } },
          { name: { contains: "terrace", mode: "insensitive" } },
        ],
      },
      select: { name: true },
    });

    if (outdoorAreas.length === 0) {
      return null;
    }

    // No real data yet, return qualitative note only
    const areaNames = outdoorAreas.map(a => a.name).join(", ");
    return {
      hasOutdoorSeating: true,
      outdoorRevenueCenters: areaNames.split(", "),
      annualOutdoorPct: null,
      springAvgDaily: null,
      summerAvgDaily: null,
      fallAvgDaily: null,
      winterAvgDaily: null,
      peakMonth: null,
      peakOutdoorPct: null,
      troughMonth: null,
      troughOutdoorPct: null,
      summerDeclinePct: null,
      estimatedSummerLoss: null,
      heatImpactOnOutdoor: null,
      note: `Has outdoor seating areas (${areaNames}). Sync revenue data to see actual outdoor impact.`,
    };
  }

  // Get unique outdoor area names
  const outdoorRevenueCenters = [...new Set(outdoorMetrics.map(m => m.revenueCenterName))];

  // Get ALL revenue center metrics for percentage calculations
  const allMetrics = await prisma.revenueCenterMetrics.findMany({
    where: {
      locationId,
      date: { gte: twelveMonthsAgo },
    },
    select: {
      date: true,
      netSales: true,
      isOutdoor: true,
    },
  });

  // Calculate total revenues
  const totalOutdoorRevenue = outdoorMetrics.reduce((sum, m) => sum + Number(m.netSales), 0);
  const totalRevenue = allMetrics.reduce((sum, m) => sum + Number(m.netSales), 0);
  const annualOutdoorPct = totalRevenue > 0
    ? Math.round((totalOutdoorRevenue / totalRevenue) * 1000) / 10
    : null;

  // Aggregate outdoor revenue by month
  const monthlyOutdoor = new Map<string, { revenue: number; days: number }>();
  const monthlyTotal = new Map<string, number>();

  for (const m of outdoorMetrics) {
    const monthKey = m.date.toISOString().slice(0, 7); // YYYY-MM
    const existing = monthlyOutdoor.get(monthKey) || { revenue: 0, days: 0 };
    existing.revenue += Number(m.netSales);
    existing.days++;
    monthlyOutdoor.set(monthKey, existing);
  }

  for (const m of allMetrics) {
    const monthKey = m.date.toISOString().slice(0, 7);
    monthlyTotal.set(monthKey, (monthlyTotal.get(monthKey) || 0) + Number(m.netSales));
  }

  // Calculate outdoor % by month and find peak/trough
  const monthlyStats: { month: string; avgDaily: number; outdoorPct: number }[] = [];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  for (const [monthKey, data] of monthlyOutdoor) {
    const total = monthlyTotal.get(monthKey) || 1;
    const avgDaily = data.days > 0 ? data.revenue / data.days : 0;
    const outdoorPct = (data.revenue / total) * 100;
    monthlyStats.push({ month: monthKey, avgDaily, outdoorPct });
  }

  // Find peak and trough months
  let peakMonth: string | null = null;
  let peakOutdoorPct: number | null = null;
  let troughMonth: string | null = null;
  let troughOutdoorPct: number | null = null;
  let peakAvgDaily = 0;
  let troughAvgDaily = Infinity;

  for (const stat of monthlyStats) {
    if (stat.outdoorPct > (peakOutdoorPct || 0)) {
      peakOutdoorPct = Math.round(stat.outdoorPct * 10) / 10;
      peakMonth = MONTH_NAMES[parseInt(stat.month.slice(5, 7)) - 1];
      peakAvgDaily = stat.avgDaily;
    }
    if (stat.outdoorPct < (troughOutdoorPct || 100)) {
      troughOutdoorPct = Math.round(stat.outdoorPct * 10) / 10;
      troughMonth = MONTH_NAMES[parseInt(stat.month.slice(5, 7)) - 1];
      troughAvgDaily = stat.avgDaily;
    }
  }

  // Calculate seasonal averages
  // Spring: Mar-Apr (months 3-4), Summer: Jun-Aug (months 6-8)
  // Fall: Oct-Nov (months 10-11), Winter: Dec-Feb (months 12, 1-2)
  const seasonalData = {
    spring: { revenue: 0, days: 0 },  // Mar-Apr
    summer: { revenue: 0, days: 0 },  // Jun-Aug
    fall: { revenue: 0, days: 0 },    // Oct-Nov
    winter: { revenue: 0, days: 0 },  // Dec-Feb
  };

  for (const m of outdoorMetrics) {
    const month = m.date.getMonth() + 1; // 1-indexed
    const revenue = Number(m.netSales);

    if (month >= 3 && month <= 4) {
      seasonalData.spring.revenue += revenue;
      seasonalData.spring.days++;
    } else if (month >= 6 && month <= 8) {
      seasonalData.summer.revenue += revenue;
      seasonalData.summer.days++;
    } else if (month >= 10 && month <= 11) {
      seasonalData.fall.revenue += revenue;
      seasonalData.fall.days++;
    } else {
      seasonalData.winter.revenue += revenue;
      seasonalData.winter.days++;
    }
  }

  const springAvgDaily = seasonalData.spring.days > 0
    ? Math.round(seasonalData.spring.revenue / seasonalData.spring.days)
    : null;
  const summerAvgDaily = seasonalData.summer.days > 0
    ? Math.round(seasonalData.summer.revenue / seasonalData.summer.days)
    : null;
  const fallAvgDaily = seasonalData.fall.days > 0
    ? Math.round(seasonalData.fall.revenue / seasonalData.fall.days)
    : null;
  const winterAvgDaily = seasonalData.winter.days > 0
    ? Math.round(seasonalData.winter.revenue / seasonalData.winter.days)
    : null;

  // Calculate summer decline from spring peak
  let summerDeclinePct: number | null = null;
  let estimatedSummerLoss: number | null = null;

  if (springAvgDaily && summerAvgDaily && springAvgDaily > 0) {
    summerDeclinePct = Math.round(((summerAvgDaily - springAvgDaily) / springAvgDaily) * 1000) / 10;

    // Estimated summer loss = (spring avg - summer avg) × summer days
    const dailyLoss = springAvgDaily - summerAvgDaily;
    if (dailyLoss > 0) {
      estimatedSummerLoss = Math.round(dailyLoss * seasonalData.summer.days);
    }
  }

  // Calculate heat impact from weather data
  const outdoorByDate = new Map<string, number>();
  for (const m of outdoorMetrics) {
    const dateStr = m.date.toISOString().slice(0, 10);
    outdoorByDate.set(dateStr, (outdoorByDate.get(dateStr) || 0) + Number(m.netSales));
  }

  const weatherData = await prisma.weatherData.findMany({
    where: {
      locationId,
      date: { gte: twelveMonthsAgo },
    },
    select: {
      date: true,
      isExtremeHeat: true,
      isRainy: true,
      isSevereWeather: true,
    },
  });

  let extremeHeatTotal = 0, extremeHeatDays = 0;
  let normalTotal = 0, normalDays = 0;

  for (const w of weatherData) {
    const dateStr = w.date.toISOString().slice(0, 10);
    const outdoorSales = outdoorByDate.get(dateStr);
    if (outdoorSales === undefined) continue;

    if (w.isExtremeHeat) {
      extremeHeatTotal += outdoorSales;
      extremeHeatDays++;
    } else if (!w.isRainy && !w.isSevereWeather) {
      normalTotal += outdoorSales;
      normalDays++;
    }
  }

  let heatImpactOnOutdoor: number | null = null;
  if (extremeHeatDays >= 3 && normalDays >= 10) {
    const extremeHeatAvg = extremeHeatTotal / extremeHeatDays;
    const normalAvg = normalTotal / normalDays;
    if (normalAvg > 0) {
      heatImpactOnOutdoor = Math.round(((extremeHeatAvg - normalAvg) / normalAvg) * 100 * 10) / 10;
    }
  }

  // Build comprehensive note
  const areaNames = outdoorRevenueCenters.join(", ");
  let note = `Outdoor areas (${areaNames}) generate ${annualOutdoorPct}% of total revenue.`;
  if (springAvgDaily && summerAvgDaily && summerDeclinePct) {
    note += ` Spring avg: $${springAvgDaily.toLocaleString()}/day, Summer avg: $${summerAvgDaily.toLocaleString()}/day (${summerDeclinePct}% decline).`;
  }
  if (estimatedSummerLoss) {
    note += ` Estimated summer heat loss: ~$${estimatedSummerLoss.toLocaleString()}.`;
  }

  return {
    hasOutdoorSeating: true,
    outdoorRevenueCenters,
    annualOutdoorPct,
    springAvgDaily,
    summerAvgDaily,
    fallAvgDaily,
    winterAvgDaily,
    peakMonth,
    peakOutdoorPct,
    troughMonth,
    troughOutdoorPct,
    summerDeclinePct,
    estimatedSummerLoss,
    heatImpactOnOutdoor,
    note,
  };
}

/**
 * Get regional climate context for AI prompts (Task 3)
 * Provides climate-aware context based on location coordinates
 */
export function getClimateContext(latitude: number, longitude: number): string {
  // San Antonio / South Texas region
  if (latitude >= 29 && latitude <= 30 && longitude >= -99 && longitude <= -98) {
    return `Regional climate: South Texas (hot subtropical).
Typical weather patterns:
- Hot summers (June-Sept): Many days >95°F, high humidity
- Mild winters: Occasional freezes but rare prolonged cold
- Monsoon season: Summer thunderstorms common July-Sept
- Spring: Best weather, pleasant temps 70-85°F
Key insight: Heat is typically the #1 weather driver here, not rain.`;
  }

  // Austin area
  if (latitude >= 30 && latitude <= 30.5 && longitude >= -98 && longitude <= -97) {
    return `Regional climate: Central Texas Hill Country.
Typical weather patterns:
- Hot summers with heat index often >100°F
- Flash flood risk during spring/fall
- Mild winters with occasional ice storms
- Spring (March-May): Optimal restaurant weather`;
  }

  // Houston area
  if (latitude >= 29.5 && latitude <= 30 && longitude >= -96 && longitude <= -95) {
    return `Regional climate: Gulf Coast (humid subtropical).
Typical weather patterns:
- Hot, humid summers (May-Oct)
- Hurricane season (June-Nov) - major disruption risk
- Mild winters, rare freezes
- Rain year-round, heaviest in spring`;
  }

  // Dallas-Fort Worth area
  if (latitude >= 32.5 && latitude <= 33 && longitude >= -97.5 && longitude <= -96.5) {
    return `Regional climate: North Texas (humid subtropical).
Typical weather patterns:
- Hot summers, cold winters (more temperature extremes)
- Severe thunderstorm/tornado season (April-June)
- Ice storms possible in winter
- Spring and fall: Best restaurant weather`;
  }

  // Generic warm climate
  if (latitude < 35) {
    return `Regional climate: Southern US (warm climate).
Heat is often a significant weather driver in summer months.`;
  }

  // Generic cold climate
  if (latitude >= 40) {
    return `Regional climate: Northern US.
Cold weather is often a significant driver in winter months.`;
  }

  // Default
  return `Regional climate: Moderate US climate.
Consider both heat and cold weather impacts seasonally.`;
}

/**
 * Get a simple summary of weather impact for use in AI prompts
 * Now includes ranked weather drivers, seasonal outdoor patterns, and holiday context
 */
export function getWeatherSummaryForAI(
  correlation: WeatherCorrelation,
  climateContext?: string
): string {
  const lines: string[] = [];

  lines.push(`Weather Analysis (${correlation.periodStart} to ${correlation.periodEnd}):`);
  lines.push(`- ${correlation.totalDaysAnalyzed} days analyzed`);
  lines.push(`- Avg daily revenue: $${correlation.avgDailyRevenue.toLocaleString()}`);

  // Include holiday context for the period
  const holidayContext = getHolidayContext(correlation.periodStart, correlation.periodEnd);
  if (holidayContext) {
    lines.push("");
    lines.push(holidayContext);
  }

  // Include San Antonio local events (get month from end date)
  const endMonth = parseInt(correlation.periodEnd.slice(5, 7));
  const saEvents = getSAEventContext(endMonth);
  if (saEvents) {
    lines.push("");
    lines.push(saEvents);
  }

  // Ranked weather drivers (most important first)
  if (correlation.weatherDrivers.length > 0) {
    lines.push("");
    lines.push("Weather Drivers (ranked by estimated annual impact):");
    for (const driver of correlation.weatherDrivers) {
      lines.push(
        `  #${driver.rank} ${driver.label}: ${driver.impactPct}% impact × ${driver.daysAffected} days/year = ~$${driver.estimatedAnnualLoss.toLocaleString()}/year`
      );
    }
  }

  // Optimal temperature
  lines.push("");
  lines.push(
    `Optimal temp range: ${correlation.tempSweetSpot.min}-${correlation.tempSweetSpot.max}°F`
  );

  // Add clarification about numbers to prevent double-counting
  lines.push("");
  lines.push("NOTE ON NUMBERS:");
  lines.push("- The weather driver ranking above shows impact ACROSS ALL revenue centers (e.g., heat costs ~$130K total)");
  lines.push("- The outdoor seasonal analysis below shows TERRACE-SPECIFIC revenue swing (e.g., $336K seasonal decline)");
  lines.push("- These are DIFFERENT metrics:");
  lines.push("  * The seasonal decline is the TOTAL swing from peak to trough (not all attributable to weather — customer preferences, seasonal menus, etc. also factor in)");
  lines.push("  * The weather driver impact is the DOW-adjusted WEATHER-ONLY impact");
  lines.push("- Use the weather driver number for weather-caused impact claims");
  lines.push("- Use the seasonal number for overall outdoor revenue patterns");
  lines.push("- NEVER cite both in a way that contradicts. Be clear which number you're using and why.");

  // OUTDOOR REVENUE DATA (the strongest finding)
  const outdoor = correlation.outdoorImpact;
  if (outdoor?.hasOutdoorSeating && outdoor.annualOutdoorPct !== null) {
    lines.push("");
    lines.push("OUTDOOR REVENUE DATA (from revenue center tracking — REAL numbers):");
    lines.push(`Outdoor areas: ${outdoor.outdoorRevenueCenters.join(", ")}`);
    lines.push(`Annual outdoor share: ${outdoor.annualOutdoorPct}%`);

    // Seasonal pattern — the strongest insight
    if (outdoor.springAvgDaily !== null && outdoor.summerAvgDaily !== null) {
      lines.push("");
      lines.push("Seasonal Pattern:");
      if (outdoor.peakMonth && outdoor.peakOutdoorPct !== null) {
        lines.push(`- Spring peak (${outdoor.peakMonth}): $${outdoor.springAvgDaily.toLocaleString()}/day, ${outdoor.peakOutdoorPct}% of revenue`);
      }
      if (outdoor.troughMonth && outdoor.troughOutdoorPct !== null) {
        lines.push(`- Summer trough (${outdoor.troughMonth}): $${outdoor.summerAvgDaily.toLocaleString()}/day, ${outdoor.troughOutdoorPct}% of revenue`);
      }
      if (outdoor.summerDeclinePct !== null) {
        lines.push(`- Decline from spring to summer: ${outdoor.summerDeclinePct}%`);
      }
      if (outdoor.fallAvgDaily !== null) {
        lines.push(`- Fall recovery (Oct-Nov): $${outdoor.fallAvgDaily.toLocaleString()}/day`);
      }
      if (outdoor.estimatedSummerLoss !== null) {
        lines.push("");
        lines.push(`Estimated revenue lost to summer heat on outdoor terrace: ~$${outdoor.estimatedSummerLoss.toLocaleString()}`);
      }
    }
  } else if (outdoor?.hasOutdoorSeating) {
    lines.push("");
    lines.push(`Outdoor Seating: ${outdoor.note}`);
  }

  // Weather/holiday/event-explained anomalies (top 5)
  if (correlation.weatherExplainedAnomalies.length > 0) {
    lines.push("");
    lines.push("Recent anomalies explained by weather, holidays, or events:");
    for (const anomaly of correlation.weatherExplainedAnomalies.slice(0, 5)) {
      let line = `  ${anomaly.date}: ${anomaly.pctDiff > 0 ? "+" : ""}${anomaly.pctDiff}%`;
      if (anomaly.likelyHolidayDriven) {
        line += ` [HOLIDAY: ${anomaly.nearbyHoliday}]`;
      } else if (anomaly.likelyEventDriven) {
        line += ` [EVENT: ${anomaly.nearbyEvent}]`;
      }
      line += ` — ${anomaly.explanation}`;
      lines.push(line);
    }
  }

  // Regional climate context
  if (climateContext) {
    lines.push("");
    lines.push(climateContext);
  }

  return lines.join("\n");
}
