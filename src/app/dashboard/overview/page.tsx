"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, Sparkles, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/use-location";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface OverviewData {
  restaurantName: string;
  healthScore: number | null;
  healthScoreTrend: number | null;
  healthScoreLabel: string | null;
  yesterday: {
    date: string;
    netSales: number;
    comparison: string;
    comparisonDetail: string;
    orderCount: number;
    wasYesterday: boolean;
  } | null;
  thisWeek: {
    totalSoFar: number;
    projectedTotal: number;
    daysRemaining: number;
    daysCounted: number;
  };
  thisMonth: {
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
  };
  alert: {
    type: "weather" | "anomaly" | "trend" | "milestone";
    icon: string;
    headline: string;
    detail: string;
  } | null;
  opportunity: {
    headline: string;
    detail: string;
    estimatedImpact: string | null;
  } | null;
  lastSyncedAt: string | null;
  dataMonths: number;
  needsOnboarding?: boolean;
  message?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${Math.round(amount).toLocaleString()}`;
  }
  return `$${Math.round(amount)}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getComparisonText(comparison: string, comparisonDetail: string): string {
  const dayMatch = comparisonDetail.match(/vs avg (\w+)/);
  const dayName = dayMatch ? dayMatch[1] : "";

  if (!dayName) {
    if (comparison === "good") return "Good day";
    if (comparison === "slow") return "Slow day";
    return "About average";
  }

  if (comparison === "good") {
    return `Good for a ${dayName}`;
  } else if (comparison === "slow") {
    return `Slow for a ${dayName}`;
  }
  return `About average for a ${dayName}`;
}

function extractDayFromDate(dateStr: string): string {
  // Extract just the day name from "Last open day: Wednesday Feb 26" or "Wednesday, Feb 26"
  const match = dateStr.match(/^(?:Last open day: )?(\w+)/);
  return match ? match[1] : "";
}

// ============================================================================
// Skeleton Components
// ============================================================================

function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-6 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard className="h-48" />
      <SkeletonCard />
    </div>
  );
}

// ============================================================================
// Card Components
// ============================================================================

function GreetingCard({ restaurantName }: { restaurantName: string }) {
  return (
    <div className="space-y-1">
      <p className="text-2xl font-light text-muted-foreground">{getGreeting()}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{restaurantName}</h1>
      <p className="text-muted-foreground">{getTodayFormatted()}</p>
    </div>
  );
}

function HealthScoreCard({
  score,
  trend,
  label,
}: {
  score: number;
  trend: number | null;
  label: string;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-emerald-50 dark:bg-emerald-950/30";
    if (score >= 60) return "bg-amber-50 dark:bg-amber-950/30";
    return "bg-red-50 dark:bg-red-950/30";
  };

  const trendText = trend
    ? trend > 0
      ? `up ${trend} points from last month`
      : trend < 0
      ? `down ${Math.abs(trend)} points from last month`
      : "same as last month"
    : null;

  return (
    <Card className={cn("border-0", getScoreBgColor(score))}>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-medium text-muted-foreground">Health Score</span>
            <span className="text-3xl font-bold tabular-nums">{Math.round(score)}</span>
            <span className="text-lg text-muted-foreground">/ 100</span>
          </div>

          <p className="text-sm text-muted-foreground">
            &ldquo;{label}&rdquo;
            {trendText && (
              <span className="ml-1">
                — {trendText}
              </span>
            )}
          </p>

          {/* Progress bar */}
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", getScoreColor(score))}
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SalesSnapshotCard({
  yesterday,
  thisWeek,
  thisMonth,
}: {
  yesterday: OverviewData["yesterday"];
  thisWeek: OverviewData["thisWeek"];
  thisMonth: OverviewData["thisMonth"];
}) {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Main rows */}
        <div className="space-y-4">
          {/* Yesterday or Last open day */}
          {yesterday && (
            <div className="space-y-1">
              {!yesterday.wasYesterday && (
                <p className="text-xs text-muted-foreground">
                  {yesterday.date}
                </p>
              )}
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted-foreground shrink-0">
                  {yesterday.wasYesterday ? "Yesterday" : extractDayFromDate(yesterday.date)}
                </span>
                <div className="flex items-baseline gap-3 text-right">
                  <span className="text-xl font-semibold tabular-nums">
                    {formatCurrency(yesterday.netSales)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getComparisonText(yesterday.comparison, yesterday.comparisonDetail)}{" "}
                    <span className="text-xs">({yesterday.comparisonDetail})</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* This week */}
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-muted-foreground shrink-0">This week</span>
            <div className="flex items-baseline gap-3 text-right">
              <span className="text-xl font-semibold tabular-nums">
                {formatCurrency(thisWeek.totalSoFar)}
              </span>
              <span className="text-sm text-muted-foreground">
                On track for ~{formatCurrency(thisWeek.projectedTotal)}
              </span>
            </div>
          </div>

          {/* This month */}
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-muted-foreground shrink-0">This month</span>
            <div className="flex items-baseline gap-3 text-right">
              <span className="text-xl font-semibold tabular-nums">
                {formatCurrency(thisMonth.total)}
              </span>
              {thisMonth.vsLastMonth && (
                <span className="text-sm text-muted-foreground">
                  {thisMonth.vsLastMonth.pct >= 0 ? (
                    <>
                      <TrendingUp className="inline h-3 w-3 text-emerald-500 mr-1" />
                      Up {Math.abs(thisMonth.vsLastMonth.pct)}% from {thisMonth.vsLastMonth.lastMonthName}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="inline h-3 w-3 text-red-500 mr-1" />
                      Down {Math.abs(thisMonth.vsLastMonth.pct)}% from {thisMonth.vsLastMonth.lastMonthName}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Best/Slowest days */}
        {(thisMonth.bestDay || thisMonth.slowestDay) && (
          <div className="pt-4 border-t space-y-1 text-sm text-muted-foreground">
            {thisMonth.bestDay && (
              <p>
                Best day this month: {thisMonth.bestDay.date} — {formatCurrency(thisMonth.bestDay.amount)}
                {thisMonth.bestDay.note && (
                  <span className="ml-1 text-xs">({thisMonth.bestDay.note})</span>
                )}
              </p>
            )}
            {thisMonth.slowestDay && (
              <p>
                Slowest day: {thisMonth.slowestDay.date} — {formatCurrency(thisMonth.slowestDay.amount)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertCard({ alert }: { alert: NonNullable<OverviewData["alert"]> }) {
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="shrink-0 text-2xl" aria-hidden>
            {alert.icon}
          </div>
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {alert.headline}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {alert.detail}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityCard({
  opportunity,
}: {
  opportunity: NonNullable<OverviewData["opportunity"]>;
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="shrink-0 text-2xl" aria-hidden>
            <Sparkles className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <p className="font-medium">An opportunity</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {opportunity.detail}
            </p>
            {opportunity.estimatedImpact && (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Estimated impact: {opportunity.estimatedImpact}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3 pt-4">
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard/reports">
          Charts & Reports
          <ArrowRight className="ml-2 h-3 w-3" />
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard/intelligence">
          AI Insights
          <ArrowRight className="ml-2 h-3 w-3" />
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard/settings">
          Settings
          <ArrowRight className="ml-2 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Welcome to Prometheus.</h1>
        <p className="text-lg text-muted-foreground">
          Connect your POS to start seeing your daily briefing.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/onboarding">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function OverviewPage() {
  const { currentLocation, isAllLocations } = useLocation();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Don't fetch if no location selected or "all locations" is selected
      if (!currentLocation || isAllLocations) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/dashboard/overview?locationId=${currentLocation.id}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch overview data");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [currentLocation, isAllLocations]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // No location selected or all locations view
  if (!currentLocation || isAllLocations) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Select a location</h1>
          <p className="text-muted-foreground">
            Choose a location from the dropdown above to see your daily briefing.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="space-y-4">
          <p className="text-lg font-semibold text-destructive">Something went wrong</p>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  // Needs onboarding
  if (data?.needsOnboarding) {
    return <EmptyState />;
  }

  // No data
  if (!data) {
    return <EmptyState />;
  }

  // Main content
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      {/* Greeting */}
      <GreetingCard restaurantName={data.restaurantName} />

      {/* Health Score (only if available) */}
      {data.healthScore !== null && (
        <HealthScoreCard
          score={data.healthScore}
          trend={data.healthScoreTrend}
          label={data.healthScoreLabel || ""}
        />
      )}

      {/* Sales Snapshot */}
      <SalesSnapshotCard
        yesterday={data.yesterday}
        thisWeek={data.thisWeek}
        thisMonth={data.thisMonth}
      />

      {/* Alert (only if exists) */}
      {data.alert && <AlertCard alert={data.alert} />}

      {/* Opportunity (only if exists) */}
      {data.opportunity && <OpportunityCard opportunity={data.opportunity} />}

      {/* Quick Actions */}
      <QuickActions />

      {/* Data freshness footer */}
      {data.lastSyncedAt && (
        <p className="text-xs text-muted-foreground text-center pt-4">
          Data synced {new Date(data.lastSyncedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          {data.dataMonths > 0 && ` · ${data.dataMonths} months of history`}
        </p>
      )}
    </div>
  );
}
