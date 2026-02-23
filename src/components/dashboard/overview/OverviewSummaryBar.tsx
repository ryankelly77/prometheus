"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ThumbsUp,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Building2,
} from "lucide-react";

interface SummaryStats {
  total: number;
  excellent: number;
  good: number;
  warning: number;
  danger: number;
  unknown: number;
}

interface OverviewSummaryBarProps {
  summary: SummaryStats;
}

const statusConfig = {
  excellent: {
    label: "Excellent",
    icon: CheckCircle2,
    bgClass: "bg-[hsl(142,76%,36%,0.1)]",
    iconClass: "text-[hsl(142,76%,36%)]",
    textClass: "text-[hsl(142,76%,36%)]",
  },
  good: {
    label: "Good",
    icon: ThumbsUp,
    bgClass: "bg-[hsl(84,81%,44%,0.1)]",
    iconClass: "text-[hsl(84,81%,44%)]",
    textClass: "text-[hsl(84,81%,44%)]",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    bgClass: "bg-[hsl(48,96%,53%,0.1)]",
    iconClass: "text-[hsl(48,96%,53%)]",
    textClass: "text-[hsl(48,96%,53%)]",
  },
  danger: {
    label: "Danger",
    icon: XCircle,
    bgClass: "bg-[hsl(0,84%,60%,0.1)]",
    iconClass: "text-[hsl(0,84%,60%)]",
    textClass: "text-[hsl(0,84%,60%)]",
  },
  unknown: {
    label: "No Data",
    icon: HelpCircle,
    bgClass: "bg-muted",
    iconClass: "text-muted-foreground",
    textClass: "text-muted-foreground",
  },
};

export function OverviewSummaryBar({ summary }: OverviewSummaryBarProps) {
  const statuses = [
    { key: "excellent", count: summary.excellent },
    { key: "good", count: summary.good },
    { key: "warning", count: summary.warning },
    { key: "danger", count: summary.danger },
    { key: "unknown", count: summary.unknown },
  ].filter((s) => s.count > 0) as Array<{
    key: keyof typeof statusConfig;
    count: number;
  }>;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center gap-6">
          {/* Total Locations */}
          <div className="flex items-center gap-4 pr-6 border-r border-border">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-4xl font-bold tabular-nums">{summary.total}</p>
              <p className="text-sm text-muted-foreground font-medium">Locations</p>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="flex flex-wrap items-center gap-3">
            {statuses.map(({ key, count }) => {
              const config = statusConfig[key];
              const Icon = config.icon;

              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-4 py-2.5",
                    config.bgClass
                  )}
                >
                  <Icon className={cn("h-5 w-5", config.iconClass)} />
                  <span className={cn("text-2xl font-bold tabular-nums", config.textClass)}>
                    {count}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
