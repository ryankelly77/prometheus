"use client";

import { cn } from "@/lib/utils";

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
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  good: {
    label: "Good",
    color: "bg-lime-500",
    textColor: "text-lime-600",
    bgColor: "bg-lime-50 dark:bg-lime-950/30",
  },
  warning: {
    label: "Warning",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
  },
  danger: {
    label: "Danger",
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/30",
  },
};

export function OverviewSummaryBar({ summary }: OverviewSummaryBarProps) {
  const statuses = ["excellent", "good", "warning", "danger"] as const;

  return (
    <div className="flex flex-wrap gap-3">
      {/* Total locations */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
        <span className="text-2xl font-bold tabular-nums">{summary.total}</span>
        <span className="text-sm text-muted-foreground">Locations</span>
      </div>

      {/* Status breakdown */}
      {statuses.map((status) => {
        const config = statusConfig[status];
        const count = summary[status];
        if (count === 0) return null;

        return (
          <div
            key={status}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2",
              config.bgColor
            )}
          >
            <div className={cn("h-3 w-3 rounded-full", config.color)} />
            <span className={cn("text-2xl font-bold tabular-nums", config.textColor)}>
              {count}
            </span>
            <span className="text-sm text-muted-foreground">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
