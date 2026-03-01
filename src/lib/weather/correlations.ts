/**
 * Weather-Sales Correlation Analysis
 *
 * Analyzes how weather impacts restaurant sales by joining daily weather
 * with transaction data. Uses day-of-week adjustment for accurate comparisons.
 */

import prisma from "@/lib/prisma";

// =============================================================================
// Types
// =============================================================================

export interface WeatherCorrelation {
  // Period info
  periodStart: string;
  periodEnd: string;
  totalDaysAnalyzed: number;

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

  // Day-of-week adjusted (important!)
  // Raw comparison is misleading if rainy days happen to fall on slow days
  // This compares rainy Tuesdays to normal Tuesdays, etc.
  adjustedRainImpactPct: number;
  adjustedExtremeHeatImpactPct: number;
  adjustedExtremeColdImpactPct: number;

  // Anomalies explained by weather
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

  return {
    periodStart,
    periodEnd,
    totalDaysAnalyzed: dailyData.length,

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
    adjustedRainImpactPct: 0,
    adjustedExtremeHeatImpactPct: 0,
    adjustedExtremeColdImpactPct: 0,
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
 * Find sales anomalies that can be explained by weather
 * An anomaly is when actual sales differ from DOW average by >20%
 */
function findWeatherExplainedAnomalies(
  data: DailyData[],
  dowAverages: Map<number, number>
): WeatherCorrelation["weatherExplainedAnomalies"] {
  const anomalies: WeatherCorrelation["weatherExplainedAnomalies"] = [];
  const ANOMALY_THRESHOLD = 20; // 20% deviation from expected

  for (const day of data) {
    const expectedSales = dowAverages.get(day.dayOfWeek);
    if (!expectedSales || expectedSales === 0) continue;

    const pctDiff = ((day.sales - expectedSales) / expectedSales) * 100;

    // Only consider significant deviations
    if (Math.abs(pctDiff) < ANOMALY_THRESHOLD) continue;

    // Check if weather can explain the anomaly
    let explanation = "";

    if (day.isSevereWeather) {
      explanation = `Severe weather: ${day.weatherDescription}`;
    } else if (day.isRainy && pctDiff < 0) {
      explanation = `Rain day: ${day.precipitation?.toFixed(1) || "?"}" precipitation`;
    } else if (day.isExtremeHeat && pctDiff < 0) {
      explanation = `Extreme heat: ${day.tempHigh}°F high`;
    } else if (day.isExtremeCold) {
      explanation = `Extreme cold: ${day.tempLow}°F low`;
    } else if (day.tempHigh !== null && day.tempHigh >= 70 && day.tempHigh <= 85 && pctDiff > 0) {
      explanation = `Perfect weather: ${day.tempHigh}°F, ${day.weatherDescription || "clear"}`;
    }

    // Only include if we can explain it with weather
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
      });
    }
  }

  // Sort by absolute impact (most significant first)
  anomalies.sort((a, b) => Math.abs(b.pctDiff) - Math.abs(a.pctDiff));

  // Return top 10 anomalies
  return anomalies.slice(0, 10);
}

/**
 * Get a simple summary of weather impact for use in AI prompts
 */
export function getWeatherSummaryForAI(correlation: WeatherCorrelation): string {
  const lines: string[] = [];

  lines.push(`Weather Analysis (${correlation.periodStart} to ${correlation.periodEnd}):`);
  lines.push(`- ${correlation.totalDaysAnalyzed} days analyzed`);

  if (correlation.rainyDayCount > 0) {
    lines.push(
      `- Rain impact: ${correlation.adjustedRainImpactPct}% on ${correlation.rainyDayCount} rainy days`
    );
    if (correlation.estimatedRainLoss > 0) {
      lines.push(`- Estimated rain loss: $${correlation.estimatedRainLoss.toLocaleString()}`);
    }
  }

  lines.push(
    `- Optimal temp range: ${correlation.tempSweetSpot.min}-${correlation.tempSweetSpot.max}°F`
  );

  if (correlation.extremeHeatDayCount > 0) {
    lines.push(
      `- Extreme heat impact: ${correlation.adjustedExtremeHeatImpactPct}% on ${correlation.extremeHeatDayCount} days >95°F`
    );
  }

  if (correlation.extremeColdDayCount > 0) {
    lines.push(
      `- Extreme cold impact: ${correlation.adjustedExtremeColdImpactPct}% on ${correlation.extremeColdDayCount} days <32°F`
    );
  }

  if (correlation.severeWeatherDays.length > 0) {
    lines.push(`- ${correlation.severeWeatherDays.length} severe weather days`);
  }

  return lines.join("\n");
}
