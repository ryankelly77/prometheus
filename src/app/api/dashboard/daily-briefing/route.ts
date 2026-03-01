import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import type { Prisma } from "@/generated/prisma";

const anthropic = new Anthropic();

interface AlertData {
  type: "weather" | "trend" | "anomaly" | "positive";
  icon: string;
  headline: string;
  detail: string;
}

interface OpportunityData {
  headline: string;
  detail: string;
  estimatedImpact: string | null;
}

interface BriefingResponse {
  alert: AlertData | null;
  opportunity: OpportunityData | null;
  cached: boolean;
  generatedAt: string;
}

/**
 * GET /api/dashboard/daily-briefing?locationId=xxx
 *
 * Generates a fresh daily briefing using Claude AI, or returns cached version.
 * Caches results per day so we don't call Claude on every page load.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const forceRefresh = searchParams.get("refresh") === "true";

  if (!locationId) {
    return NextResponse.json(
      { error: "locationId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Verify location belongs to user's organization
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        restaurantGroup: true,
        restaurantProfile: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check for cached briefing for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Delete cached briefing if force refresh requested
    if (forceRefresh) {
      console.log("[Daily Briefing] Force refresh requested, deleting cache for", location.name);
      await prisma.dailyBriefing.deleteMany({
        where: {
          locationId,
          briefingDate: today,
        },
      });
    } else {
      const cached = await prisma.dailyBriefing.findUnique({
        where: {
          locationId_briefingDate: {
            locationId,
            briefingDate: today,
          },
        },
      });

      if (cached) {
        console.log("[Daily Briefing] Returning cached briefing for", location.name);
        return NextResponse.json({
          alert: cached.alert as AlertData | null,
          opportunity: cached.opportunity as OpportunityData | null,
          cached: true,
          generatedAt: cached.generatedAt.toISOString(),
        });
      }
    }

    // Check if Claude is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("[Daily Briefing] Claude not configured, returning null");
      return NextResponse.json({
        alert: null,
        opportunity: null,
        cached: false,
        generatedAt: new Date().toISOString(),
      });
    }

    // Gather data for the briefing
    const briefingData = await gatherBriefingData(locationId, location);

    // Generate briefing using Claude
    console.log("[Daily Briefing] Generating new briefing for", location.name);
    const { alert, opportunity, tokensUsed } = await generateBriefing(
      location.name,
      location.restaurantType,
      location.restaurantProfile,
      briefingData
    );

    // Cache the result
    await prisma.dailyBriefing.create({
      data: {
        locationId,
        briefingDate: today,
        alert: alert as unknown as Prisma.InputJsonValue | undefined,
        opportunity: opportunity as unknown as Prisma.InputJsonValue | undefined,
        inputData: briefingData as unknown as Prisma.InputJsonValue,
        model: "claude-sonnet-4-5-20250929",
        tokensUsed,
      },
    });

    return NextResponse.json({
      alert,
      opportunity,
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Daily Briefing] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate briefing", details: errorMessage } as { error: string },
      { status: 500 }
    );
  }
}

// ============================================================================
// Data Gathering
// ============================================================================

interface BriefingInputData {
  todayFormatted: string;
  dayOfWeek: string;
  yesterday: {
    date: string;
    dayOfWeek: string;
    sales: number;
    dowAverage: number;
    pctDiff: number;
  } | null;
  last7Days: Array<{ date: string; dayOfWeek: string; sales: number }>;
  weekTotal: number;
  monthTotal: number;
  lastMonthTotal: number;
  lastMonthName: string;
  dowAverages: Record<string, number>;
  recentAnomalies: Array<{ date: string; sales: number; expected: number; pctDiff: number }>;
  weather: Array<{ date: string; condition: string; precipProb: number; tempHigh: number }> | null;
  previousInsights: string[];
  userContext: string[];
  conceptDescription: string | null;
}

async function gatherBriefingData(
  locationId: string,
  location: { restaurantProfile: { conceptDescription: string | null; userContext: string[] } | null }
): Promise<BriefingInputData> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Get all transactions for calculations
  const allTransactions = await prisma.transactionSummary.findMany({
    where: { locationId },
    orderBy: { date: "desc" },
  });

  // Calculate DOW averages
  const dowTotals: Record<string, { total: number; count: number }> = {};
  for (const tx of allTransactions) {
    const sales = Number(tx.netSales);
    if (sales <= 0) continue;
    const dayName = dayNames[new Date(tx.date).getDay()];
    if (!dowTotals[dayName]) {
      dowTotals[dayName] = { total: 0, count: 0 };
    }
    dowTotals[dayName].total += sales;
    dowTotals[dayName].count += 1;
  }

  const dowAverages: Record<string, number> = {};
  for (const [day, data] of Object.entries(dowTotals)) {
    dowAverages[day] = data.count > 0 ? Math.round(data.total / data.count) : 0;
  }

  // Get yesterday's data
  const yesterdayTx = allTransactions.find(
    (tx) => isSameDay(new Date(tx.date), yesterday)
  );
  const yesterdayDOW = dayNames[yesterday.getDay()];
  const yesterdayData = yesterdayTx
    ? {
        date: formatDate(yesterday),
        dayOfWeek: yesterdayDOW,
        sales: Math.round(Number(yesterdayTx.netSales)),
        dowAverage: dowAverages[yesterdayDOW] || 0,
        pctDiff: dowAverages[yesterdayDOW]
          ? Math.round(((Number(yesterdayTx.netSales) - dowAverages[yesterdayDOW]) / dowAverages[yesterdayDOW]) * 100)
          : 0,
      }
    : null;

  // Get last 7 days
  const last7Days: Array<{ date: string; dayOfWeek: string; sales: number }> = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const tx = allTransactions.find((t) => isSameDay(new Date(t.date), d));
    if (tx) {
      last7Days.push({
        date: formatShortDate(d),
        dayOfWeek: dayNames[d.getDay()].slice(0, 3),
        sales: Math.round(Number(tx.netSales)),
      });
    }
  }

  // Calculate week total (Mon-today)
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysFromMonday);

  let weekTotal = 0;
  for (const tx of allTransactions) {
    const txDate = new Date(tx.date);
    if (txDate >= startOfWeek && txDate < today) {
      weekTotal += Number(tx.netSales);
    }
  }

  // Calculate month totals
  let monthTotal = 0;
  let lastMonthTotal = 0;
  for (const tx of allTransactions) {
    const txDate = new Date(tx.date);
    if (txDate >= startOfMonth && txDate < today) {
      monthTotal += Number(tx.netSales);
    }
    if (txDate >= startOfLastMonth && txDate <= endOfLastMonth) {
      lastMonthTotal += Number(tx.netSales);
    }
  }

  // Find anomalies (days that deviated significantly from DOW average)
  const recentAnomalies: Array<{ date: string; sales: number; expected: number; pctDiff: number }> = [];
  for (const tx of allTransactions.slice(0, 14)) {
    // Last 2 weeks
    const sales = Number(tx.netSales);
    if (sales <= 0) continue;
    const dayName = dayNames[new Date(tx.date).getDay()];
    const expected = dowAverages[dayName] || 0;
    if (expected > 0) {
      const pctDiff = ((sales - expected) / expected) * 100;
      if (Math.abs(pctDiff) > 20) {
        recentAnomalies.push({
          date: formatDate(new Date(tx.date)),
          sales: Math.round(sales),
          expected: Math.round(expected),
          pctDiff: Math.round(pctDiff),
        });
      }
    }
  }

  // Get weather data for next 3 days
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  const weatherData = await prisma.weatherData.findMany({
    where: {
      locationId,
      date: {
        gte: today,
        lte: threeDaysFromNow,
      },
    },
    orderBy: { date: "asc" },
  });

  const weather = weatherData.length > 0
    ? weatherData.map((w) => ({
        date: formatShortDate(new Date(w.date)),
        condition: w.condition || "Unknown",
        precipProb: w.precipProb || 0,
        tempHigh: Math.round(w.tempHigh || 70),
      }))
    : null;

  // Get previous insights to avoid repetition
  const previousInsights = await prisma.aIInsight.findMany({
    where: {
      locationId,
      generatedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    select: { headline: true, title: true },
    orderBy: { generatedAt: "desc" },
    take: 10,
  });

  const previousHeadlines = previousInsights
    .map((i) => i.headline || i.title)
    .filter(Boolean) as string[];

  // Get user context from profile
  const userContext = location.restaurantProfile?.userContext || [];
  const conceptDescription = location.restaurantProfile?.conceptDescription || null;

  return {
    todayFormatted: formatDate(today),
    dayOfWeek: dayNames[today.getDay()],
    yesterday: yesterdayData,
    last7Days,
    weekTotal: Math.round(weekTotal),
    monthTotal: Math.round(monthTotal),
    lastMonthTotal: Math.round(lastMonthTotal),
    lastMonthName: startOfLastMonth.toLocaleDateString("en-US", { month: "long" }),
    dowAverages,
    recentAnomalies,
    weather,
    previousInsights: previousHeadlines,
    userContext,
    conceptDescription,
  };
}

// ============================================================================
// Claude Generation
// ============================================================================

async function generateBriefing(
  restaurantName: string,
  restaurantType: string | null,
  profile: { conceptDescription: string | null; userContext: string[] } | null,
  data: BriefingInputData
): Promise<{ alert: AlertData | null; opportunity: OpportunityData | null; tokensUsed: number }> {
  const prompt = buildBriefingPrompt(restaurantName, restaurantType, profile, data);

  if (process.env.NODE_ENV === "development") {
    console.log("[Daily Briefing] === PROMPT ===");
    console.log(prompt);
    console.log("[Daily Briefing] === END PROMPT ===");
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    system: "You are a restaurant business advisor. Generate concise, actionable daily briefings based on actual sales data. Always return valid JSON.",
  });

  const tokensUsed = (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

  // Extract the text content
  const textContent = message.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse the JSON response
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

  try {
    const parsed = JSON.parse(jsonText);
    return {
      alert: parsed.alert || null,
      opportunity: parsed.opportunity || null,
      tokensUsed,
    };
  } catch (parseError) {
    console.error("[Daily Briefing] Failed to parse Claude response:", jsonText);
    throw new Error("Failed to parse briefing response");
  }
}

function buildBriefingPrompt(
  restaurantName: string,
  restaurantType: string | null,
  profile: { conceptDescription: string | null; userContext: string[] } | null,
  data: BriefingInputData
): string {
  const restaurantTypeLabel = restaurantType
    ? restaurantType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Restaurant";

  let prompt = `You are a restaurant advisor giving a daily briefing to the owner of ${restaurantName}.

Restaurant Profile:
${restaurantTypeLabel}${profile?.conceptDescription ? ` · ${profile.conceptDescription}` : ""}
${data.userContext.length > 0 ? data.userContext.join("\n") : ""}

Today is ${data.todayFormatted} (${data.dayOfWeek}).

Recent sales data:`;

  if (data.yesterday) {
    prompt += `
- Yesterday (${data.yesterday.dayOfWeek}): $${data.yesterday.sales.toLocaleString()} (DOW average: $${data.yesterday.dowAverage.toLocaleString()}, ${data.yesterday.pctDiff >= 0 ? "+" : ""}${data.yesterday.pctDiff}%)`;
  }

  prompt += `
- This week so far: $${data.weekTotal.toLocaleString()}
- Last 7 days: ${data.last7Days.map((d) => `${d.dayOfWeek} $${d.sales.toLocaleString()}`).join(", ")}
- This month: $${data.monthTotal.toLocaleString()} (${data.lastMonthName}: $${data.lastMonthTotal.toLocaleString()})

Day-of-week averages:
${Object.entries(data.dowAverages)
  .map(([day, avg]) => `- ${day}: $${avg.toLocaleString()}`)
  .join("\n")}`;

  if (data.weather && data.weather.length > 0) {
    prompt += `

Weather forecast:
${data.weather.map((w) => `- ${w.date}: ${w.condition}, ${w.precipProb}% precip, High ${w.tempHigh}°F`).join("\n")}`;
  }

  if (data.recentAnomalies.length > 0) {
    prompt += `

Recent anomalies (unusual days):
${data.recentAnomalies.map((a) => `- ${a.date}: $${a.sales.toLocaleString()} (${a.pctDiff >= 0 ? "+" : ""}${a.pctDiff}% vs expected $${a.expected.toLocaleString()})`).join("\n")}`;
  }

  prompt += `

Generate exactly TWO items:

1. ALERT: The single most important thing the owner should know today.
2. OPPORTUNITY: One specific, actionable thing they could do this week.

CRITICAL FORMATTING RULES:
- Each item is MAX 2-3 sentences. No exceptions.
- Write like you're texting the owner, not writing a report.
- First sentence: the finding (with one specific number).
- Second sentence: why it matters or what to do about it.
- Third sentence (optional): estimated impact.
- NO analysis of multiple possibilities ("either X, or Y, or Z")
- NO hedging ("however, without data, it's impossible to determine")
- NO cultural commentary or industry context
- Pick ONE clear takeaway and state it directly.
- Use plain language a high schooler would understand.

BAD example (too long, too analytical):
"February is tracking $77,046 behind January at $516,197 versus $593,243—a 13% decline. With today being the last Saturday of the month, you'd need an exceptional day to close this gap. Even accounting for February having fewer days, the daily average is noticeably softer than last month's performance."

GOOD example (concise, direct):
"February is running 13% behind January — you're at $516K vs $593K last month. Today's the last Saturday to close the gap."`;

  if (data.previousInsights.length > 0) {
    prompt += `

Previous insights (don't repeat these):
${data.previousInsights.slice(0, 5).join("\n")}`;
  }

  prompt += `

Return as JSON:
{
  "alert": {
    "type": "weather|trend|anomaly|positive",
    "icon": "⚠️|🌧️|📉|🎉",
    "headline": "8 words max",
    "detail": "2-3 sentences max. Under 50 words total."
  },
  "opportunity": {
    "headline": "8 words max",
    "detail": "2-3 sentences max. Under 50 words total.",
    "estimatedImpact": "$X/week or $X/month"
  }
}`;

  return prompt;
}

// ============================================================================
// Helper Functions
// ============================================================================

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
