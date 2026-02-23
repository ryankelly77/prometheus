"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronRight, Clock } from "lucide-react";
import { LocationData } from "./LocationCard";

interface Insight {
  id: string;
  locationId: string;
  locationName: string;
  title: string;
  content: string;
  urgency: "HIGH" | "MEDIUM" | "LOW" | "INFO" | "CRITICAL";
  generatedAt: Date;
}

interface OverviewInsightsProps {
  locations: LocationData[];
  insights?: Insight[];
}

const urgencyConfig = {
  CRITICAL: {
    dotColor: "bg-red-600",
    label: "Critical",
  },
  HIGH: {
    dotColor: "bg-red-500",
    label: "High",
  },
  MEDIUM: {
    dotColor: "bg-yellow-500",
    label: "Medium",
  },
  LOW: {
    dotColor: "bg-blue-500",
    label: "Low",
  },
  INFO: {
    dotColor: "bg-slate-400",
    label: "Info",
  },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Generate mock insights based on location data when no insights provided
function generateMockInsights(locations: LocationData[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Find locations with notable conditions
  const lowestScore = [...locations]
    .filter((l) => l.healthScore !== null)
    .sort((a, b) => (a.healthScore ?? 0) - (b.healthScore ?? 0))[0];

  const highestTrend = [...locations]
    .filter((l) => l.salesTrend !== null)
    .sort((a, b) => (b.salesTrend ?? 0) - (a.salesTrend ?? 0))[0];

  const lowestTrend = [...locations]
    .filter((l) => l.salesTrend !== null && l.salesTrend < 0)
    .sort((a, b) => (a.salesTrend ?? 0) - (b.salesTrend ?? 0))[0];

  if (lowestScore && lowestScore.healthScore !== null && lowestScore.healthScore < 90) {
    insights.push({
      id: "insight-1",
      locationId: lowestScore.id,
      locationName: lowestScore.name,
      title: "Health score needs attention",
      content: `Health score at ${lowestScore.healthScore}% - review key metrics to identify improvement areas.`,
      urgency: lowestScore.healthScore < 80 ? "HIGH" : "MEDIUM",
      generatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });
  }

  if (highestTrend && highestTrend.salesTrend !== null && highestTrend.salesTrend > 5) {
    insights.push({
      id: "insight-2",
      locationId: highestTrend.id,
      locationName: highestTrend.name,
      title: "Strong sales momentum",
      content: `Sales trending up ${highestTrend.salesTrend.toFixed(1)}% vs last month. Continue current strategies.`,
      urgency: "LOW",
      generatedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
    });
  }

  if (lowestTrend && lowestTrend.salesTrend !== null) {
    insights.push({
      id: "insight-3",
      locationId: lowestTrend.id,
      locationName: lowestTrend.name,
      title: "Sales trend declining",
      content: `Sales down ${Math.abs(lowestTrend.salesTrend).toFixed(1)}% vs last month. Consider promotional activities.`,
      urgency: Math.abs(lowestTrend.salesTrend) > 10 ? "HIGH" : "MEDIUM",
      generatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    });
  }

  return insights;
}

export function OverviewInsights({ locations, insights: providedInsights }: OverviewInsightsProps) {
  const insights = useMemo(() => {
    if (providedInsights && providedInsights.length > 0) {
      return providedInsights.slice(0, 5);
    }
    return generateMockInsights(locations);
  }, [locations, providedInsights]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Prometheus Insights</CardTitle>
          </div>
          <Link
            href="/dashboard/intelligence"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {insights.map((insight, index) => {
            const config = urgencyConfig[insight.urgency];

            return (
              <div
                key={insight.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50",
                  index !== insights.length - 1 && "border-b border-border/50"
                )}
              >
                {/* Urgency indicator */}
                <div className="flex-shrink-0 pt-1.5">
                  <span
                    className={cn(
                      "block h-2.5 w-2.5 rounded-full",
                      config.dotColor
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm text-muted-foreground truncate">
                      {insight.locationName}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {insight.title}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {insight.content}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(insight.generatedAt)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
