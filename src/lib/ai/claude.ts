/**
 * Claude AI Client
 *
 * Provides a comprehensive interface to the Anthropic Claude API for generating
 * restaurant intelligence insights with full restaurant profile context.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";
import { analyzeWeatherCorrelations, getClimateContext } from "@/lib/weather/correlations";
import { fetchForecast } from "@/lib/weather/open-meteo";
import {
  calculateConfidence,
  getHedgeInstructions,
  type IntelligenceConfidence,
} from "@/lib/intelligence/confidence";
import { AI_RULES } from "./prompts";

// Initialize the client (uses ANTHROPIC_API_KEY env var by default)
const anthropic = new Anthropic();

export type RestaurantType =
  | "fine_dining"
  | "casual_dining"
  | "fast_casual"
  | "quick_service"
  | "cafe"
  | "bar_pub"
  | "bistro"
  | "ethnic_specialty"
  | "food_truck"
  | "buffet"
  | "family_style"
  | "ghost_kitchen";

export interface RestaurantTypeContext {
  label: string;
  benchmarks: string;
  strategies: string;
}

export const RESTAURANT_TYPE_CONTEXT: Record<RestaurantType, RestaurantTypeContext> = {
  fine_dining: {
    label: "Fine Dining",
    benchmarks: "Average check $100-300, 60-120 covers/night, food cost 28-35%, labor 30-35%, wine/beverage 25-40% of revenue",
    strategies: "Focus on experience, wine program, private events, tasting menus, seasonal menu rotations, sommelier-driven upselling",
  },
  casual_dining: {
    label: "Casual Dining",
    benchmarks: "Average check $40-80, 150-300 covers/night, food cost 28-32%, labor 25-30%, bar 20-30% of revenue",
    strategies: "Happy hour programs, loyalty/rewards, family promotions, online ordering, catering, local partnerships",
  },
  fast_casual: {
    label: "Fast Casual",
    benchmarks: "Average check $12-25, 200-500 transactions/day, food cost 28-32%, labor 25-28%, minimal bar revenue",
    strategies: "Speed of service optimization, digital ordering, loyalty apps, catering, daypart expansion, LTO items",
  },
  quick_service: {
    label: "Quick Service / QSR",
    benchmarks: "Average check $8-15, 300-800 transactions/day, food cost 25-30%, labor 22-28%, drive-thru 60-70% of sales",
    strategies: "Drive-thru optimization, combo meal engineering, mobile ordering, breakfast daypart, late night",
  },
  cafe: {
    label: "Café",
    benchmarks: "Average check $8-18, beverage-heavy mix (60%+ beverage), food cost 25-30%, morning peak critical",
    strategies: "Morning rush optimization, food attachment rate, afternoon daypart, retail merchandise, catering",
  },
  bar_pub: {
    label: "Bar / Pub / Tavern",
    benchmarks: "Average check $25-50, beverage 50-70% of revenue, food cost 28-35% on food items, late night important",
    strategies: "Happy hour strategy, live events/entertainment, sports programming, late night food, trivia/game nights",
  },
  bistro: {
    label: "Bistro",
    benchmarks: "Average check $50-100, 80-150 covers/night, wine 20-30% of revenue, food cost 30-35%",
    strategies: "Prix fixe menus, wine pairing programs, seasonal rotations, weekday specials, neighborhood loyalty",
  },
  ethnic_specialty: {
    label: "Ethnic / Specialty Restaurant",
    benchmarks: "Average check $20-60, varies widely by cuisine, food cost 28-35%, authenticity drives loyalty",
    strategies: "Cultural event tie-ins, family-style options, catering for cultural events, cooking classes, takeout/delivery",
  },
  food_truck: {
    label: "Food Truck / Mobile Vendor",
    benchmarks: "Average check $10-18, 100-300 transactions/day, food cost 28-35%, location is everything",
    strategies: "Location optimization, event booking, social media presence, catering, commissary efficiency",
  },
  buffet: {
    label: "Buffet",
    benchmarks: "Fixed price $15-40, high volume, food cost 35-45%, labor efficient, waste management critical",
    strategies: "Waste reduction, station optimization, off-peak pricing, group/party packages, holiday specials",
  },
  family_style: {
    label: "Family-Style Restaurant",
    benchmarks: "Average check $15-35, high table turns, family-friendly, food cost 28-33%, kids menu important",
    strategies: "Kids eat free promotions, birthday parties, early bird specials, takeout family meals, weeknight bundles",
  },
  ghost_kitchen: {
    label: "Ghost Kitchen / Virtual Restaurant",
    benchmarks: "Average check $20-40, 100% delivery/pickup, food cost 28-33%, no FOH labor, 15-30% commission to platforms",
    strategies: "Platform optimization, virtual brand expansion, delivery radius analysis, packaging quality, menu engineering for delivery",
  },
};

export interface WeatherDriverFact {
  factor: string; // 'extreme_heat', 'rain', 'extreme_cold', 'severe_weather'
  label: string; // 'Extreme Heat (>95°F)', 'Rain', etc.
  impactPct: number; // DOW-adjusted impact percentage
  daysAffected: number; // annualized days affected
  estimatedAnnualLoss: number; // projected annual revenue impact
  rank: number; // 1 = biggest impact
}

export interface WeatherAnomaly {
  date: string;
  dayOfWeek: string;
  sales: number;
  expectedSales: number;
  pctDiff: number;
  weatherDescription: string;
  tempHigh: number;
  precipitation: number;
  explanation: string;
}

export interface ForecastDay {
  date: string;
  dayOfWeek: string;
  weatherDescription: string;
  tempHigh: number;
  tempLow: number;
  precipitation: number;
  isRainy: boolean;
  isExtremeHeat: boolean;
  isExtremeCold: boolean;
  isSevereWeather: boolean;
  expectedImpact?: string; // e.g., "Rain expected to reduce sales ~5%"
}

export interface WeatherFacts {
  // Analysis period
  periodStart: string;
  periodEnd: string;
  totalDaysAnalyzed: number;
  // Ranked weather drivers (most impactful first)
  weatherDrivers: WeatherDriverFact[];
  avgDailyRevenue: number;
  // Rain impact details
  rainImpactPct: number; // DOW-adjusted
  rainyDayCount: number;
  estimatedRainLoss: number; // over the analysis period
  // Temperature impact
  tempSweetSpot: { min: number; max: number };
  extremeHeatImpactPct: number;
  extremeHeatDayCount: number;
  extremeColdImpactPct: number;
  extremeColdDayCount: number;
  severeWeatherEvents: number;
  // Anomalies explained by weather (detailed)
  weatherExplainedAnomalies: WeatherAnomaly[];
  // 7-day forecast with expected impacts
  forecast: ForecastDay[];
  // Outdoor seating
  hasOutdoorSeating: boolean;
  outdoorNote?: string;
  // Regional context
  climateContext?: string;
  analyzedAt: string;
}

export interface DataFacts {
  avgMonthlyRevenue?: number;
  avgDailyRevenue?: number;
  avgCheck?: number;
  totalMonthsOfData?: number;
  totalOrders?: number;
  avgDailyOrders?: number;
  peakDays?: string[];
  weakestDays?: string[];
  dayOfWeekAvg?: Record<string, number>;
  revenueMix?: { food?: number; wine?: number; beer?: number; liquor?: number };
  monthlyTrend?: Array<{ month: string; netSales: number; orders: number }>;
  monthOverMonthGrowth?: number;
  seasonalPeak?: string;
  weather?: WeatherFacts;
}

export interface RestaurantProfile {
  id: string;
  locationId: string;
  restaurantType?: string | null;
  conceptDescription?: string | null;
  cuisineType?: string | null;
  priceRange?: string | null;
  seatingCapacity?: number | null;
  neighborhood?: string | null;
  targetDemographic?: string | null;
  selectedDescriptors: string[];
  userContext: string[];
  dataFacts: DataFacts;
  factsUpdatedAt?: Date | null;
}

export interface PreviousInsight {
  id: string;
  title: string | null;
  content: string;
  generatedAt: Date;
}

export interface InsightFeedbackRecord {
  insightId: string;
  insightTitle: string | null;
  rating: string;
  userComment: string | null;
}

export interface IntelligenceRequest {
  locationId: string;
  locationName: string;
  dataType: "pos" | "accounting" | "combined";
  restaurantType?: RestaurantType | null;
  city?: string | null;
  state?: string | null;
  salesData?: {
    months: number;
    totalRevenue: number;
    avgDailyRevenue: number;
    topDays: { day: string; revenue: number }[];
    slowDays: { day: string; revenue: number }[];
    transactionCount: number;
    avgCheckSize: number;
    trend: "up" | "down" | "flat";
  };
  costData?: {
    months: number;
    totalCosts: number;
    laborPercent: number;
    foodPercent: number;
    primeCost: number;
    trend: "up" | "down" | "flat";
  };
  // Enhanced profile data (loaded from database)
  profile?: RestaurantProfile | null;
  previousInsights?: PreviousInsight[];
  feedbackRecords?: InsightFeedbackRecord[];
}

export interface IntelligenceResponse {
  title: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  dataQuality: "excellent" | "good" | "limited";
}

/**
 * Load full restaurant profile and context from database
 */
export async function loadRestaurantContext(locationId: string): Promise<{
  profile: RestaurantProfile | null;
  previousInsights: PreviousInsight[];
  feedbackRecords: InsightFeedbackRecord[];
}> {
  // Load restaurant profile
  const profile = await prisma.restaurantProfile.findUnique({
    where: { locationId },
  });

  // Load previous insights (last 10)
  const insights = await prisma.aIInsight.findMany({
    where: { locationId },
    orderBy: { generatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      content: true,
      generatedAt: true,
    },
  });

  // Load feedback on previous insights
  const feedback = await prisma.insightFeedback.findMany({
    where: { locationId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      insight: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return {
    profile: profile
      ? {
          ...profile,
          dataFacts: (profile.dataFacts as DataFacts) || {},
        }
      : null,
    previousInsights: insights,
    feedbackRecords: feedback.map((f) => ({
      insightId: f.insightId,
      insightTitle: f.insight.title,
      rating: f.rating,
      userComment: f.userComment,
    })),
  };
}

/**
 * Calculate data facts from transaction data
 */
export async function calculateDataFacts(locationId: string): Promise<DataFacts> {
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
  sevenMonthsAgo.setDate(1);

  // Get all transaction summaries
  const transactions = await prisma.transactionSummary.findMany({
    where: {
      locationId,
      date: { gte: sevenMonthsAgo },
    },
    orderBy: { date: "desc" },
  });

  if (transactions.length === 0) {
    return {};
  }

  // Calculate totals
  const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.netSales ?? 0), 0);
  const totalOrders = transactions.reduce((sum, tx) => sum + (tx.transactionCount ?? 0), 0);
  const daysWithData = transactions.length;

  // Calculate averages
  const avgDailyRevenue = totalRevenue / daysWithData;
  const avgDailyOrders = totalOrders / daysWithData;
  const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Group by day of week
  const dayOfWeekTotals: Record<string, { revenue: number; count: number }> = {};
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (const tx of transactions) {
    const dayIndex = new Date(tx.date).getDay();
    const dayName = dayNames[dayIndex];
    if (!dayOfWeekTotals[dayName]) {
      dayOfWeekTotals[dayName] = { revenue: 0, count: 0 };
    }
    dayOfWeekTotals[dayName].revenue += Number(tx.netSales ?? 0);
    dayOfWeekTotals[dayName].count += 1;
  }

  // Calculate day of week averages
  const dayOfWeekAvg: Record<string, number> = {};
  for (const [day, data] of Object.entries(dayOfWeekTotals)) {
    dayOfWeekAvg[day] = Math.round(data.revenue / data.count);
  }

  // Sort days by revenue
  const sortedDays = Object.entries(dayOfWeekAvg)
    .sort(([, a], [, b]) => b - a)
    .map(([day]) => day);

  const peakDays = sortedDays.slice(0, 3);
  const weakestDays = sortedDays.slice(-2).reverse();

  // Group by month for trends
  const monthlyData: Record<string, { revenue: number; orders: number }> = {};
  for (const tx of transactions) {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { revenue: 0, orders: 0 };
    }
    monthlyData[monthKey].revenue += Number(tx.netSales ?? 0);
    monthlyData[monthKey].orders += tx.transactionCount ?? 0;
  }

  const monthlyTrend = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      netSales: Math.round(data.revenue),
      orders: data.orders,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Calculate month-over-month growth
  let monthOverMonthGrowth = 0;
  if (monthlyTrend.length >= 2) {
    const latest = monthlyTrend[monthlyTrend.length - 1].netSales;
    const previous = monthlyTrend[monthlyTrend.length - 2].netSales;
    if (previous > 0) {
      monthOverMonthGrowth = ((latest - previous) / previous) * 100;
    }
  }

  // Find seasonal peak (highest revenue month)
  const seasonalPeak = monthlyTrend.length > 0
    ? monthlyTrend.reduce((max, m) => (m.netSales > max.netSales ? m : max)).month
    : undefined;

  // Calculate average monthly revenue
  const totalMonthsOfData = monthlyTrend.length;
  const avgMonthlyRevenue = totalMonthsOfData > 0 ? totalRevenue / totalMonthsOfData : 0;

  // Get category breakdown from daypart metrics
  const daypartMetrics = await prisma.daypartMetrics.findMany({
    where: {
      locationId,
      date: { gte: sevenMonthsAgo },
    },
  });

  let foodTotal = 0;
  let wineTotal = 0;
  let beerTotal = 0;
  let liquorTotal = 0;

  for (const dp of daypartMetrics) {
    foodTotal += Number(dp.foodSales ?? 0);
    wineTotal += Number(dp.wineSales ?? 0);
    beerTotal += Number(dp.beerSales ?? 0);
    liquorTotal += Number(dp.liquorSales ?? 0);
  }

  const categoryTotal = foodTotal + wineTotal + beerTotal + liquorTotal;
  const revenueMix =
    categoryTotal > 0
      ? {
          food: Math.round((foodTotal / categoryTotal) * 100),
          wine: Math.round((wineTotal / categoryTotal) * 100),
          beer: Math.round((beerTotal / categoryTotal) * 100),
          liquor: Math.round((liquorTotal / categoryTotal) * 100),
        }
      : undefined;

  // Calculate weather correlations if we have weather data
  let weather: WeatherFacts | undefined;
  try {
    const weatherCorrelation = await analyzeWeatherCorrelations(locationId);
    if (weatherCorrelation.totalDaysAnalyzed > 0) {
      // Get location coordinates for climate context and forecast
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { latitude: true, longitude: true, timezone: true },
      });

      const climateContext =
        location?.latitude && location?.longitude
          ? getClimateContext(location.latitude, location.longitude)
          : undefined;

      // Fetch 7-day forecast with expected impacts
      let forecast: WeatherFacts["forecast"] = [];
      if (location?.latitude && location?.longitude) {
        try {
          const rawForecast = await fetchForecast(
            location.latitude,
            location.longitude,
            7,
            location.timezone || undefined
          );
          forecast = rawForecast.map((day) => {
            // Calculate expected impact based on historical correlations
            let expectedImpact: string | undefined;
            if (day.isSevereWeather) {
              expectedImpact = `Severe weather may significantly reduce sales`;
            } else if (day.isExtremeHeat && weatherCorrelation.adjustedExtremeHeatImpactPct < -5) {
              expectedImpact = `Extreme heat expected to reduce sales ~${Math.abs(weatherCorrelation.adjustedExtremeHeatImpactPct)}%`;
            } else if (day.isExtremeCold && weatherCorrelation.adjustedExtremeColdImpactPct < -5) {
              expectedImpact = `Extreme cold expected to reduce sales ~${Math.abs(weatherCorrelation.adjustedExtremeColdImpactPct)}%`;
            } else if (day.isRainy && weatherCorrelation.adjustedRainImpactPct < -3) {
              expectedImpact = `Rain expected to reduce sales ~${Math.abs(weatherCorrelation.adjustedRainImpactPct)}%`;
            }

            return {
              date: day.date,
              dayOfWeek: new Date(day.date).toLocaleDateString("en-US", { weekday: "long" }),
              weatherDescription: day.weatherDescription,
              tempHigh: Math.round(day.tempHigh),
              tempLow: Math.round(day.tempLow),
              precipitation: day.precipitationInches,
              isRainy: day.isRainy,
              isExtremeHeat: day.isExtremeHeat,
              isExtremeCold: day.isExtremeCold,
              isSevereWeather: day.isSevereWeather,
              expectedImpact,
            };
          });
        } catch (forecastError) {
          console.log("[DataFacts] Forecast fetch skipped:", forecastError instanceof Error ? forecastError.message : "Unknown error");
        }
      }

      weather = {
        // Analysis period
        periodStart: weatherCorrelation.periodStart,
        periodEnd: weatherCorrelation.periodEnd,
        totalDaysAnalyzed: weatherCorrelation.totalDaysAnalyzed,
        // Ranked weather drivers (most impactful first)
        weatherDrivers: weatherCorrelation.weatherDrivers.map((d) => ({
          factor: d.factor,
          label: d.label,
          impactPct: d.impactPct,
          daysAffected: d.daysAffected,
          estimatedAnnualLoss: d.estimatedAnnualLoss,
          rank: d.rank,
        })),
        avgDailyRevenue: weatherCorrelation.avgDailyRevenue,
        // Rain impact details
        rainImpactPct: weatherCorrelation.adjustedRainImpactPct,
        rainyDayCount: weatherCorrelation.rainyDayCount,
        estimatedRainLoss: weatherCorrelation.estimatedRainLoss,
        // Temperature impact
        tempSweetSpot: weatherCorrelation.tempSweetSpot,
        extremeHeatImpactPct: weatherCorrelation.adjustedExtremeHeatImpactPct,
        extremeHeatDayCount: weatherCorrelation.extremeHeatDayCount,
        extremeColdImpactPct: weatherCorrelation.adjustedExtremeColdImpactPct,
        extremeColdDayCount: weatherCorrelation.extremeColdDayCount,
        severeWeatherEvents: weatherCorrelation.severeWeatherDays.length,
        // Detailed anomalies
        weatherExplainedAnomalies: weatherCorrelation.weatherExplainedAnomalies.map((a) => ({
          date: a.date,
          dayOfWeek: a.dayOfWeek,
          sales: a.sales,
          expectedSales: a.expectedSales,
          pctDiff: a.pctDiff,
          weatherDescription: a.weatherDescription,
          tempHigh: a.tempHigh,
          precipitation: a.precipitation,
          explanation: a.explanation,
        })),
        // 7-day forecast
        forecast,
        // Outdoor seating
        hasOutdoorSeating: weatherCorrelation.outdoorImpact?.hasOutdoorSeating ?? false,
        outdoorNote: weatherCorrelation.outdoorImpact?.note,
        // Regional context
        climateContext,
        analyzedAt: new Date().toISOString(),
      };
    }
  } catch (weatherError) {
    // Weather analysis is optional - don't fail if it errors
    console.log("[DataFacts] Weather analysis skipped:", weatherError instanceof Error ? weatherError.message : "Unknown error");
  }

  return {
    avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
    avgDailyRevenue: Math.round(avgDailyRevenue),
    avgCheck: Math.round(avgCheck * 100) / 100,
    totalMonthsOfData,
    totalOrders,
    avgDailyOrders: Math.round(avgDailyOrders),
    peakDays,
    weakestDays,
    dayOfWeekAvg,
    revenueMix,
    monthlyTrend,
    monthOverMonthGrowth: Math.round(monthOverMonthGrowth * 10) / 10,
    seasonalPeak,
    weather,
  };
}

/**
 * Update restaurant profile with calculated data facts
 */
export async function updateDataFacts(locationId: string): Promise<DataFacts> {
  const facts = await calculateDataFacts(locationId);

  // Upsert the profile with new facts
  await prisma.restaurantProfile.upsert({
    where: { locationId },
    create: {
      locationId,
      dataFacts: facts as object,
      factsUpdatedAt: new Date(),
    },
    update: {
      dataFacts: facts as object,
      factsUpdatedAt: new Date(),
    },
  });

  return facts;
}

function buildSystemPrompt(confidence?: IntelligenceConfidence): string {
  const hedgeInstructions = confidence ? getHedgeInstructions(confidence) : "";

  let prompt = `You are an expert restaurant analytics consultant who provides highly tailored, actionable insights. Your role is to analyze restaurant data and provide personalized recommendations that respect the restaurant's unique identity and context.
${AI_RULES}
Guidelines:
- Be specific and actionable - never give generic advice
- Use actual numbers from the data provided
- Respect the operator's stated context as ground truth
- Tailor recommendations to both the restaurant TYPE (financial benchmarks) and CONCEPT (brand identity)
- Focus on opportunities, not just observations
- Each insight should have a clear, implementable recommendation`;

  // Add confidence-based hedge instructions
  if (hedgeInstructions) {
    prompt += `

== DATA CONFIDENCE GUIDANCE ==
${hedgeInstructions}`;
  }

  prompt += `

CRITICAL: Return your response as valid JSON with this exact structure:
{
  "title": "Concise headline summarizing the key finding",
  "summary": "2-3 sentence executive summary of the analysis",
  "insights": ["insight 1 with specific numbers", "insight 2", "insight 3"],
  "recommendations": ["specific actionable recommendation 1", "recommendation 2"],
  "dataQuality": "excellent|good|limited"
}`;

  return prompt;
}

function buildUserPrompt(
  request: IntelligenceRequest,
  confidence?: IntelligenceConfidence
): string {
  const parts: string[] = [];
  const typeContext = request.restaurantType ? RESTAURANT_TYPE_CONTEXT[request.restaurantType] : null;
  const profile = request.profile;

  // == RESTAURANT PROFILE ==
  parts.push("== RESTAURANT PROFILE ==");
  parts.push(`Name: ${request.locationName}`);
  if (typeContext) {
    parts.push(`Type: ${typeContext.label}`);
  }
  if (profile?.conceptDescription) {
    parts.push(`Concept: ${profile.conceptDescription}`);
  }
  if (profile?.cuisineType) {
    parts.push(`Cuisine: ${profile.cuisineType}`);
  }
  if (request.city || request.state) {
    const location = [request.city, request.state].filter(Boolean).join(", ");
    parts.push(`Location: ${location}`);
  }
  if (profile?.neighborhood) {
    parts.push(`Neighborhood: ${profile.neighborhood}`);
  }
  if (profile?.priceRange) {
    parts.push(`Price Range: ${profile.priceRange}`);
  }
  if (profile?.seatingCapacity) {
    parts.push(`Seating Capacity: ${profile.seatingCapacity}`);
  }
  if (profile?.targetDemographic) {
    parts.push(`Target Customer: ${profile.targetDemographic}`);
  }
  parts.push("");

  // == INTELLIGENCE CONFIDENCE ==
  if (confidence) {
    parts.push("== INTELLIGENCE CONFIDENCE ==");
    parts.push(`Data Completeness: ${confidence.score}% (${confidence.level})`);
    parts.push(`Connected Sources: ${confidence.connectedLayers.join(", ") || "None"}`);
    if (confidence.missingLayers.length > 0) {
      const missingLabels = confidence.missingLayers.slice(0, 3).map((l) => l.label);
      parts.push(`Missing Sources: ${missingLabels.join(", ")}`);
    }
    parts.push(`Hedge Level: ${confidence.hedgeLevel}`);
    parts.push(confidence.disclaimer);
    parts.push("");
  }

  // == TYPE vs CONCEPT GUIDANCE ==
  if (typeContext && profile?.conceptDescription) {
    parts.push("== TYPE vs CONCEPT GUIDANCE ==");
    parts.push(
      `This restaurant operates as a ${typeContext.label} financially, but has the brand identity of "${profile.conceptDescription}".`
    );
    parts.push("Use TYPE for financial benchmarks and operational efficiency targets.");
    parts.push("Use CONCEPT for all recommendation tone, language, and suggested strategies.");
    parts.push("NEVER suggest strategies that conflict with the concept identity.");
    parts.push(
      "Example: A $150 avg check French brasserie operates like fine dining financially but recommendations should match brasserie identity."
    );
    parts.push("");
  }

  // == INDUSTRY BENCHMARKS ==
  if (typeContext) {
    parts.push("== INDUSTRY BENCHMARKS ==");
    parts.push(`For ${typeContext.label} operations:`);
    parts.push(`Benchmarks: ${typeContext.benchmarks}`);
    parts.push(`Common Strategies: ${typeContext.strategies}`);
    parts.push("");
  }

  // == OPERATOR CONTEXT ==
  if (profile?.userContext && profile.userContext.length > 0) {
    parts.push("== OPERATOR CONTEXT ==");
    parts.push(
      "These are facts from the restaurant operator. Treat as ground truth. They override any assumptions:"
    );
    for (const context of profile.userContext) {
      parts.push(`- ${context}`);
    }
    parts.push("");
  }

  // == DATA FACTS ==
  const dataFacts = profile?.dataFacts || {};
  if (Object.keys(dataFacts).length > 0) {
    parts.push("== DATA FACTS (Auto-calculated from POS) ==");
    if (dataFacts.avgMonthlyRevenue) {
      parts.push(`Average Monthly Revenue: $${dataFacts.avgMonthlyRevenue.toLocaleString()}`);
    }
    if (dataFacts.avgDailyRevenue) {
      parts.push(`Average Daily Revenue: $${dataFacts.avgDailyRevenue.toLocaleString()}`);
    }
    if (dataFacts.avgCheck) {
      parts.push(`Average Check: $${dataFacts.avgCheck.toFixed(2)}`);
    }
    if (dataFacts.totalOrders) {
      parts.push(`Total Orders (period): ${dataFacts.totalOrders.toLocaleString()}`);
    }
    if (dataFacts.avgDailyOrders) {
      parts.push(`Average Daily Orders: ${dataFacts.avgDailyOrders}`);
    }
    if (dataFacts.peakDays && dataFacts.peakDays.length > 0) {
      parts.push(`Peak Days: ${dataFacts.peakDays.join(", ")}`);
    }
    if (dataFacts.weakestDays && dataFacts.weakestDays.length > 0) {
      parts.push(`Weakest Days: ${dataFacts.weakestDays.join(", ")}`);
    }
    if (dataFacts.revenueMix) {
      const mix = dataFacts.revenueMix;
      const mixStr = Object.entries(mix)
        .filter(([, v]) => v && v > 0)
        .map(([k, v]) => `${k}: ${v}%`)
        .join(", ");
      if (mixStr) {
        parts.push(`Revenue Mix: ${mixStr}`);
      }
    }
    if (dataFacts.monthOverMonthGrowth !== undefined) {
      const growthStr =
        dataFacts.monthOverMonthGrowth >= 0
          ? `+${dataFacts.monthOverMonthGrowth}%`
          : `${dataFacts.monthOverMonthGrowth}%`;
      parts.push(`Month-over-Month Growth: ${growthStr}`);
    }
    if (dataFacts.seasonalPeak) {
      parts.push(`Seasonal Peak: ${dataFacts.seasonalPeak}`);
    }
    parts.push("");

    // == WEATHER INTELLIGENCE ==
    if (dataFacts.weather && dataFacts.weather.totalDaysAnalyzed > 0) {
      const w = dataFacts.weather;
      parts.push("== WEATHER INTELLIGENCE ==");
      parts.push(`Analysis period: ${w.periodStart} to ${w.periodEnd} (${w.totalDaysAnalyzed} days)`);
      parts.push("");

      // Ranked weather drivers
      if (w.weatherDrivers.length > 0) {
        parts.push("Weather Drivers (ranked by estimated annual revenue impact):");
        for (const driver of w.weatherDrivers) {
          parts.push(
            `  #${driver.rank} ${driver.label}: ${driver.impactPct}% impact × ${driver.daysAffected} days/year = ~$${driver.estimatedAnnualLoss.toLocaleString()}/year lost`
          );
        }
        parts.push("");
      }

      // Rain impact details
      parts.push("Rain Impact (DOW-adjusted):");
      parts.push(`- Rainy days reduce sales by ${w.rainImpactPct}%`);
      parts.push(`- ${w.rainyDayCount} rainy days in analysis period`);
      parts.push(`- Estimated revenue lost to rain: $${w.estimatedRainLoss.toLocaleString()}`);
      parts.push("");

      // Temperature impact
      parts.push("Temperature Impact:");
      parts.push(`- Optimal temperature range: ${w.tempSweetSpot.min}-${w.tempSweetSpot.max}°F`);
      if (w.extremeHeatDayCount > 0) {
        parts.push(`- Extreme heat (>95°F) impact: ${w.extremeHeatImpactPct}% on ${w.extremeHeatDayCount} days`);
      }
      if (w.extremeColdDayCount > 0) {
        parts.push(`- Extreme cold (<32°F) impact: ${w.extremeColdImpactPct}% on ${w.extremeColdDayCount} days`);
      }
      if (w.severeWeatherEvents > 0) {
        parts.push(`- Severe weather events: ${w.severeWeatherEvents}`);
      }
      parts.push("");

      // Outdoor seating
      if (w.hasOutdoorSeating && w.outdoorNote) {
        parts.push(`Outdoor Seating: ${w.outdoorNote}`);
        parts.push("");
      }

      // Weather-explained anomalies
      if (w.weatherExplainedAnomalies.length > 0) {
        parts.push("Previously Unexplained Anomalies Now Explained by Weather:");
        for (const a of w.weatherExplainedAnomalies.slice(0, 5)) {
          const diffStr = a.pctDiff > 0 ? `+${a.pctDiff}%` : `${a.pctDiff}%`;
          parts.push(
            `- ${a.date} (${a.dayOfWeek}): Sales $${a.sales.toLocaleString()} (${diffStr} vs expected $${a.expectedSales.toLocaleString()}) — ${a.weatherDescription}, ${a.tempHigh}°F, ${a.precipitation}" precip`
          );
        }
        parts.push("");
      }

      // 7-day forecast
      if (w.forecast.length > 0) {
        parts.push("7-Day Forecast:");
        for (const day of w.forecast) {
          let line = `- ${day.date} (${day.dayOfWeek}): ${day.weatherDescription}, High ${day.tempHigh}°F, ${day.precipitation}" precip`;
          if (day.expectedImpact) {
            line += ` — ${day.expectedImpact}`;
          }
          parts.push(line);
        }
        parts.push("");
      }

      // Regional climate context
      if (w.climateContext) {
        parts.push(w.climateContext);
        parts.push("");
      }

      // Instructions for AI
      parts.push("When generating insights:");
      parts.push("- Reference specific weather events that explain sales anomalies");
      parts.push("- If a previous insight flagged an unexplained anomaly, SOLVE IT with weather data");
      parts.push("- Use the forecast to predict impact on upcoming days");
      parts.push("- Compare weather-adjusted performance (how did they do GIVEN the weather) vs raw performance");
      parts.push("");
    }
  }

  // == CURRENT PERIOD DATA ==
  if (request.salesData) {
    parts.push("== CURRENT SALES DATA ==");
    parts.push(`Period: ${request.salesData.months} months of data`);
    parts.push(`Total Revenue: $${request.salesData.totalRevenue.toLocaleString()}`);
    parts.push(`Average Daily Revenue: $${request.salesData.avgDailyRevenue.toLocaleString()}`);
    parts.push(`Total Transactions: ${request.salesData.transactionCount.toLocaleString()}`);
    parts.push(`Average Check Size: $${request.salesData.avgCheckSize.toFixed(2)}`);
    parts.push(`Revenue Trend: ${request.salesData.trend}`);
    if (request.salesData.topDays.length > 0) {
      parts.push(
        `Best Days: ${request.salesData.topDays.map((d) => `${d.day} ($${d.revenue.toLocaleString()})`).join(", ")}`
      );
    }
    if (request.salesData.slowDays.length > 0) {
      parts.push(
        `Slowest Days: ${request.salesData.slowDays.map((d) => `${d.day} ($${d.revenue.toLocaleString()})`).join(", ")}`
      );
    }
    parts.push("");
  }

  if (request.costData) {
    parts.push("== COST DATA ==");
    parts.push(`Period: ${request.costData.months} months of data`);
    parts.push(`Total Operating Costs: $${request.costData.totalCosts.toLocaleString()}`);
    parts.push(`Labor Cost %: ${request.costData.laborPercent.toFixed(1)}%`);
    parts.push(`Food Cost %: ${request.costData.foodPercent.toFixed(1)}%`);
    parts.push(`Prime Cost (Labor + Food): ${request.costData.primeCost.toFixed(1)}%`);
    parts.push(`Cost Trend: ${request.costData.trend}`);
    parts.push("");
  }

  // == PREVIOUS INSIGHTS ==
  if (request.previousInsights && request.previousInsights.length > 0) {
    parts.push("== PREVIOUS INSIGHTS ==");
    parts.push("Do NOT repeat these. Generate new, different insights:");
    for (const insight of request.previousInsights.slice(0, 5)) {
      const title = insight.title || "Untitled";
      const summary = insight.content.slice(0, 100);
      parts.push(`- ${title}: ${summary}...`);
    }
    parts.push("");
  }

  // == FEEDBACK ON PREVIOUS INSIGHTS ==
  if (request.feedbackRecords && request.feedbackRecords.length > 0) {
    const negativeFeedback = request.feedbackRecords.filter(
      (f) => f.rating === "not_helpful" || f.rating === "incorrect"
    );
    if (negativeFeedback.length > 0) {
      parts.push("== FEEDBACK ON PREVIOUS INSIGHTS ==");
      parts.push(
        "Do not suggest ideas similar to insights marked not_helpful or incorrect. Learn from this feedback:"
      );
      for (const fb of negativeFeedback.slice(0, 5)) {
        const title = fb.insightTitle || "Insight";
        parts.push(`- "${title}" was marked ${fb.rating}`);
        if (fb.userComment) {
          parts.push(`  Reason: ${fb.userComment}`);
        }
      }
      parts.push("");
    }
  }

  // == TASK ==
  parts.push("== TASK ==");
  parts.push("Generate exactly 3 NEW insights that are:");
  parts.push(`1. Specific to THIS restaurant (use actual numbers from ${request.locationName}'s data)`);
  if (typeContext && profile?.conceptDescription) {
    parts.push(
      `2. Appropriate for a ${typeContext.label} operation with a "${profile.conceptDescription}" identity`
    );
  } else if (typeContext) {
    parts.push(`2. Appropriate for a ${typeContext.label} operation`);
  } else {
    parts.push("2. Appropriate for this restaurant's operations");
  }
  parts.push("3. Actionable — each should have a clear, implementable recommendation");
  parts.push("4. Respectful of operator context (don't contradict what they've told you)");
  parts.push("5. Different from previous insights and responsive to any negative feedback");
  parts.push(
    "6. For the last insight, identify something you cannot fully explain with current data and suggest which additional data source would help"
  );
  parts.push("");
  parts.push("Return as JSON with: title, summary, insights (array of 3), recommendations (array), dataQuality");

  return parts.join("\n");
}

export async function generateIntelligence(
  request: IntelligenceRequest
): Promise<IntelligenceResponse> {
  // Load restaurant context if not already provided
  let enhancedRequest = { ...request };

  if (!request.profile && request.locationId) {
    const context = await loadRestaurantContext(request.locationId);
    enhancedRequest = {
      ...request,
      profile: context.profile,
      previousInsights: context.previousInsights,
      feedbackRecords: context.feedbackRecords,
    };

    // If profile has no data facts or they're stale, calculate them
    if (
      !context.profile?.dataFacts ||
      Object.keys(context.profile.dataFacts).length === 0 ||
      !context.profile.factsUpdatedAt ||
      Date.now() - new Date(context.profile.factsUpdatedAt).getTime() > 24 * 60 * 60 * 1000
    ) {
      const facts = await calculateDataFacts(request.locationId);
      if (enhancedRequest.profile) {
        enhancedRequest.profile.dataFacts = facts;
      } else {
        enhancedRequest.profile = {
          id: "",
          locationId: request.locationId,
          selectedDescriptors: [],
          userContext: [],
          dataFacts: facts,
        };
      }
    }
  }

  // Calculate intelligence confidence for this location
  let confidence: IntelligenceConfidence | undefined;
  try {
    confidence = await calculateConfidence(request.locationId);
  } catch (error) {
    console.log("[Claude] Confidence calculation skipped:", error instanceof Error ? error.message : "Unknown error");
  }

  const userPrompt = buildUserPrompt(enhancedRequest, confidence);
  const systemPrompt = buildSystemPrompt(confidence);

  // Log the prompt for debugging (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log("[Claude] === FULL PROMPT ===");
    console.log(userPrompt);
    console.log("[Claude] === END PROMPT ===");
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  // Extract the text content
  const textContent = message.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse the JSON response
  try {
    // Strip markdown code block formatting if present
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const response = JSON.parse(jsonText) as IntelligenceResponse;
    return response;
  } catch {
    // If JSON parsing fails, create a structured response from the text
    return {
      title: "Analysis Complete",
      summary: textContent.text.slice(0, 200),
      insights: [textContent.text],
      recommendations: [],
      dataQuality: "limited",
    };
  }
}

/**
 * Check if the Claude API is available
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
