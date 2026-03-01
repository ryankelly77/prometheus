import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

/**
 * GET /api/dashboard/overview
 *
 * Returns all data needed for the simple overview dashboard in one call.
 * Gathers: health score, yesterday's sales, this week, this month, alerts, opportunities.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

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
        integrations: {
          where: { status: "CONNECTED" },
          orderBy: { lastSyncAt: "desc" },
          take: 1,
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get the date range for queries
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = subDays(today, 1);

    // Calculate start of week (Monday)
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = subDays(today, daysFromMonday);

    // Calculate start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate previous month range
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get all transaction data we need
    const allTransactions = await prisma.transactionSummary.findMany({
      where: { locationId },
      orderBy: { date: "desc" },
    });

    // Check if we have any data
    if (allTransactions.length === 0) {
      return NextResponse.json({
        needsOnboarding: true,
        restaurantName: location.name,
        message: "No sales data available. Please connect your POS system.",
      });
    }

    // Calculate how many months of data we have
    const oldestDate = allTransactions[allTransactions.length - 1].date;
    const dataMonths = Math.ceil(
      (today.getTime() - new Date(oldestDate).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );

    // Calculate day-of-week averages from all historical data
    const dowAverages = calculateDOWAverages(allTransactions);

    // Get yesterday's data (or most recent open day)
    const yesterdayData = await getYesterdayData(
      allTransactions,
      yesterday,
      dowAverages
    );

    // Get this week data
    const thisWeekData = getThisWeekData(
      allTransactions,
      startOfWeek,
      today,
      dowAverages
    );

    // Get this month data
    const thisMonthData = getThisMonthData(
      allTransactions,
      startOfMonth,
      today,
      startOfLastMonth,
      endOfLastMonth
    );

    // Get health score (most recent)
    const healthScoreData = await getHealthScore(locationId);

    // Get alert and opportunity from daily briefing cache
    const briefingData = await getDailyBriefing(locationId);

    // Get last sync time
    const lastSyncedAt = location.integrations[0]?.lastSyncAt?.toISOString() ?? null;

    return NextResponse.json({
      restaurantName: location.name,

      // Health Score
      healthScore: healthScoreData?.score ?? null,
      healthScoreTrend: healthScoreData?.trend ?? null,
      healthScoreLabel: healthScoreData?.label ?? null,

      // Yesterday
      yesterday: yesterdayData,

      // This Week
      thisWeek: thisWeekData,

      // This Month
      thisMonth: thisMonthData,

      // Alert & Opportunity (from daily briefing)
      alert: briefingData.alert,
      opportunity: briefingData.opportunity,

      // Data freshness
      lastSyncedAt,
      dataMonths,
    });
  } catch (error) {
    console.error("Overview API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch overview data", details: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

interface TransactionRecord {
  date: Date;
  netSales: unknown; // Prisma Decimal
  transactionCount: number;
}

interface DOWAverages {
  [key: string]: { avg: number; count: number };
}

/**
 * Calculate day-of-week averages from all historical data
 */
function calculateDOWAverages(transactions: TransactionRecord[]): DOWAverages {
  const dowTotals: { [key: string]: { total: number; count: number } } = {
    Sunday: { total: 0, count: 0 },
    Monday: { total: 0, count: 0 },
    Tuesday: { total: 0, count: 0 },
    Wednesday: { total: 0, count: 0 },
    Thursday: { total: 0, count: 0 },
    Friday: { total: 0, count: 0 },
    Saturday: { total: 0, count: 0 },
  };

  for (const tx of transactions) {
    const sales = Number(tx.netSales);
    // Skip days with no sales (closed days)
    if (sales <= 0) continue;

    const dayName = getDayName(new Date(tx.date));
    if (dowTotals[dayName]) {
      dowTotals[dayName].total += sales;
      dowTotals[dayName].count += 1;
    }
  }

  const averages: DOWAverages = {};
  for (const [day, data] of Object.entries(dowTotals)) {
    averages[day] = {
      avg: data.count > 0 ? data.total / data.count : 0,
      count: data.count,
    };
  }

  return averages;
}

/**
 * Get yesterday's data or most recent open day
 */
function getYesterdayData(
  transactions: TransactionRecord[],
  yesterday: Date,
  dowAverages: DOWAverages
): {
  date: string;
  netSales: number;
  comparison: string;
  comparisonDetail: string;
  orderCount: number;
  wasYesterday: boolean;
} | null {
  // Find yesterday's transaction
  const yesterdayTx = transactions.find(
    (tx) => isSameDay(new Date(tx.date), yesterday)
  );

  let targetDate = yesterday;
  let targetTx = yesterdayTx;
  let wasYesterday = true;

  // If yesterday has no data or was closed, find most recent open day
  if (!yesterdayTx || Number(yesterdayTx.netSales) === 0) {
    wasYesterday = false;
    // Find the most recent day with sales
    for (const tx of transactions) {
      if (Number(tx.netSales) > 0) {
        targetTx = tx;
        targetDate = new Date(tx.date);
        break;
      }
    }
  }

  if (!targetTx || Number(targetTx.netSales) === 0) {
    return null;
  }

  const netSales = Number(targetTx.netSales);
  const dayName = getDayName(targetDate);
  const avgForDay = dowAverages[dayName]?.avg ?? 0;

  let comparison: string;
  let comparisonDetail: string;

  if (avgForDay > 0) {
    const pctDiff = ((netSales - avgForDay) / avgForDay) * 100;
    const sign = pctDiff >= 0 ? "+" : "";

    if (pctDiff > 10) {
      comparison = "good";
    } else if (pctDiff < -10) {
      comparison = "slow";
    } else {
      comparison = "average";
    }

    comparisonDetail = `${sign}${Math.round(pctDiff)}% vs avg ${dayName}`;
  } else {
    comparison = "average";
    comparisonDetail = `First ${dayName} on record`;
  }

  return {
    date: wasYesterday
      ? formatDate(targetDate)
      : `Last open day: ${formatDate(targetDate)}`,
    netSales,
    comparison,
    comparisonDetail,
    orderCount: targetTx.transactionCount,
    wasYesterday,
  };
}

/**
 * Get this week data with projection
 */
function getThisWeekData(
  transactions: TransactionRecord[],
  startOfWeek: Date,
  today: Date,
  dowAverages: DOWAverages
): {
  totalSoFar: number;
  projectedTotal: number;
  daysRemaining: number;
  daysCounted: number;
} {
  // Sum actual days so far (Monday through yesterday)
  let totalSoFar = 0;
  let daysCounted = 0;

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    if (txDate >= startOfWeek && txDate < today) {
      totalSoFar += Number(tx.netSales);
      daysCounted++;
    }
  }

  // Calculate remaining days (today through Sunday)
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const daysRemaining = daysUntilSunday + 1; // Include today

  // Project remaining days using DOW averages
  let projectedRemaining = 0;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (let i = 0; i <= daysUntilSunday; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const futureDayName = dayNames[futureDate.getDay()];
    projectedRemaining += dowAverages[futureDayName]?.avg ?? 0;
  }

  return {
    totalSoFar: Math.round(totalSoFar),
    projectedTotal: Math.round(totalSoFar + projectedRemaining),
    daysRemaining,
    daysCounted,
  };
}

/**
 * Get this month data with comparisons
 */
function getThisMonthData(
  transactions: TransactionRecord[],
  startOfMonth: Date,
  today: Date,
  startOfLastMonth: Date,
  endOfLastMonth: Date
): {
  total: number;
  daysIntoMonth: number;
  monthName: string;
  vsLastMonth: {
    amount: number;
    pct: number;
    lastMonthName: string;
    lastMonthTotal: number;
  } | null;
  bestDay: {
    date: string;
    amount: number;
    note: string | null;
  } | null;
  slowestDay: {
    date: string;
    amount: number;
  } | null;
} {
  // Calculate this month total
  let thisMonthTotal = 0;
  let bestDay: { date: Date; amount: number } | null = null;
  let slowestDay: { date: Date; amount: number } | null = null;

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    if (txDate >= startOfMonth && txDate < today) {
      const sales = Number(tx.netSales);
      thisMonthTotal += sales;

      // Track best day (only days with sales)
      if (sales > 0) {
        if (!bestDay || sales > bestDay.amount) {
          bestDay = { date: txDate, amount: sales };
        }
        if (!slowestDay || sales < slowestDay.amount) {
          slowestDay = { date: txDate, amount: sales };
        }
      }
    }
  }

  // Calculate last month total
  let lastMonthTotal = 0;
  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    if (txDate >= startOfLastMonth && txDate <= endOfLastMonth) {
      lastMonthTotal += Number(tx.netSales);
    }
  }

  const daysIntoMonth = Math.floor(
    (today.getTime() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000)
  );

  const monthName = today.toLocaleDateString("en-US", { month: "long" });
  const lastMonthName = startOfLastMonth.toLocaleDateString("en-US", { month: "long" });

  // Calculate month-over-month comparison (only if we have last month data)
  let vsLastMonth = null;
  if (lastMonthTotal > 0) {
    const amount = thisMonthTotal - lastMonthTotal;
    const pct = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    vsLastMonth = {
      amount: Math.round(amount),
      pct: Math.round(pct * 10) / 10,
      lastMonthName,
      lastMonthTotal: Math.round(lastMonthTotal),
    };
  }

  // Add note for best day if it's a notable date
  let bestDayNote: string | null = null;
  if (bestDay) {
    bestDayNote = getNotableDate(bestDay.date);
  }

  return {
    total: Math.round(thisMonthTotal),
    daysIntoMonth,
    monthName,
    vsLastMonth,
    bestDay: bestDay
      ? {
          date: formatDate(bestDay.date),
          amount: Math.round(bestDay.amount),
          note: bestDayNote,
        }
      : null,
    slowestDay: slowestDay
      ? {
          date: formatDate(slowestDay.date),
          amount: Math.round(slowestDay.amount),
        }
      : null,
  };
}

/**
 * Check if a date is notable (holiday, special event)
 */
function getNotableDate(date: Date): string | null {
  const month = date.getMonth();
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // Valentine's Day weekend
  if (month === 1 && day >= 13 && day <= 15) {
    return "Valentine's weekend";
  }

  // New Year's Eve/Day
  if ((month === 11 && day === 31) || (month === 0 && day === 1)) {
    return "New Year's";
  }

  // Mother's Day (2nd Sunday in May)
  if (month === 4 && dayOfWeek === 0 && day >= 8 && day <= 14) {
    return "Mother's Day";
  }

  // Father's Day (3rd Sunday in June)
  if (month === 5 && dayOfWeek === 0 && day >= 15 && day <= 21) {
    return "Father's Day";
  }

  // Thanksgiving (4th Thursday in November)
  if (month === 10 && dayOfWeek === 4 && day >= 22 && day <= 28) {
    return "Thanksgiving";
  }

  // Christmas Eve/Day
  if (month === 11 && (day === 24 || day === 25)) {
    return "Christmas";
  }

  return null;
}

function isSameDay(date1: Date, date2: Date): boolean {
  // Use UTC methods to avoid timezone issues with date-only comparisons
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Get the most recent health score
 */
async function getHealthScore(
  locationId: string
): Promise<{ score: number; trend: number | null; label: string } | null> {
  const healthScore = await prisma.healthScoreHistory.findFirst({
    where: { locationId },
    orderBy: { month: "desc" },
  });

  if (!healthScore) {
    return null;
  }

  const score = Number(healthScore.overallScore);
  const trend = healthScore.scoreDelta ? Number(healthScore.scoreDelta) : null;

  // Generate label based on score
  let label: string;
  if (score >= 90) {
    label = "Excellent";
  } else if (score >= 80) {
    label = "Strong";
  } else if (score >= 70) {
    label = "Doing well";
  } else if (score >= 60) {
    label = "Needs attention";
  } else {
    label = "Needs improvement";
  }

  return { score, trend, label };
}

/**
 * Get daily briefing (alert and opportunity) from cache
 *
 * Note: We only read from cache here. The briefing is generated when the user
 * visits the overview page (client calls /api/dashboard/daily-briefing directly).
 */
async function getDailyBriefing(
  locationId: string
): Promise<{
  alert: {
    type: "weather" | "anomaly" | "trend" | "milestone" | "positive";
    icon: string;
    headline: string;
    detail: string;
  } | null;
  opportunity: {
    headline: string;
    detail: string;
    estimatedImpact: string | null;
  } | null;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cached = await prisma.dailyBriefing.findUnique({
      where: {
        locationId_briefingDate: {
          locationId,
          briefingDate: today,
        },
      },
    });

    if (cached) {
      return {
        alert: cached.alert as {
          type: "weather" | "anomaly" | "trend" | "milestone" | "positive";
          icon: string;
          headline: string;
          detail: string;
        } | null,
        opportunity: cached.opportunity as {
          headline: string;
          detail: string;
          estimatedImpact: string | null;
        } | null,
      };
    }

    // No cached briefing - return null (client will generate on demand)
    return { alert: null, opportunity: null };
  } catch (error) {
    console.error("[Overview] Failed to get daily briefing:", error);
    return { alert: null, opportunity: null };
  }
}
