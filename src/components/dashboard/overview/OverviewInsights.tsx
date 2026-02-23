"use client";

import { AlertTriangle, TrendingDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationData } from "./LocationCard";

interface OverviewInsightsProps {
  locations: LocationData[];
}

interface Insight {
  type: "danger" | "warning" | "opportunity";
  title: string;
  description: string;
  locationName: string;
  locationId: string;
}

function generateInsights(locations: LocationData[]): Insight[] {
  const insights: Insight[] = [];

  // Find locations in danger
  const dangerLocations = locations.filter((l) => l.healthStatus === "danger");
  for (const loc of dangerLocations.slice(0, 2)) {
    insights.push({
      type: "danger",
      title: "Health Score Critical",
      description: `${loc.name} has a health score of ${loc.healthScore}%, below the danger threshold.`,
      locationName: loc.name,
      locationId: loc.id,
    });
  }

  // Find locations with significant negative trends
  const decliningLocations = locations
    .filter((l) => l.salesTrend !== null && l.salesTrend < -10)
    .sort((a, b) => (a.salesTrend ?? 0) - (b.salesTrend ?? 0));

  for (const loc of decliningLocations.slice(0, 2)) {
    if (insights.length >= 3) break;
    insights.push({
      type: "warning",
      title: "Sales Declining",
      description: `${loc.name} is down ${Math.abs(loc.salesTrend ?? 0).toFixed(1)}% vs last month.`,
      locationName: loc.name,
      locationId: loc.id,
    });
  }

  // Find top performing locations
  const topPerformers = locations
    .filter((l) => l.salesTrend !== null && l.salesTrend > 10)
    .sort((a, b) => (b.salesTrend ?? 0) - (a.salesTrend ?? 0));

  for (const loc of topPerformers.slice(0, 1)) {
    if (insights.length >= 3) break;
    insights.push({
      type: "opportunity",
      title: "Strong Performance",
      description: `${loc.name} is up ${loc.salesTrend?.toFixed(1)}% — review what's working.`,
      locationName: loc.name,
      locationId: loc.id,
    });
  }

  return insights.slice(0, 3);
}

const insightConfig = {
  danger: {
    icon: AlertTriangle,
    bgColor: "bg-red-50 dark:bg-red-950/30",
    iconColor: "text-red-500",
    borderColor: "border-red-200 dark:border-red-900",
  },
  warning: {
    icon: TrendingDown,
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    iconColor: "text-yellow-500",
    borderColor: "border-yellow-200 dark:border-yellow-900",
  },
  opportunity: {
    icon: Lightbulb,
    bgColor: "bg-green-50 dark:bg-green-950/30",
    iconColor: "text-green-500",
    borderColor: "border-green-200 dark:border-green-900",
  },
};

export function OverviewInsights({ locations }: OverviewInsightsProps) {
  const insights = generateInsights(locations);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-primary" />
          Prometheus Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const config = insightConfig[insight.type];
            const Icon = config.icon;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconColor)} />
                <div>
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
