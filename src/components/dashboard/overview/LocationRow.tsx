"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationData } from "./LocationCard";

interface LocationRowProps {
  location: LocationData;
  onClick: () => void;
}

const statusColors = {
  excellent: "bg-green-500",
  good: "bg-lime-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
  unknown: "bg-muted",
};

const statusTextColors = {
  excellent: "text-green-600",
  good: "text-lime-600",
  warning: "text-yellow-600",
  danger: "text-red-600",
  unknown: "text-muted-foreground",
};

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function LocationRow({ location, onClick }: LocationRowProps) {
  const trend = location.salesTrend;
  const isPositive = trend !== null && trend > 0;
  const isNegative = trend !== null && trend < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div
      className="flex cursor-pointer items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      {/* Health Score Indicator */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-3 w-3 rounded-full flex-shrink-0",
            statusColors[location.healthStatus]
          )}
        />
        <span
          className={cn(
            "w-10 text-right font-bold tabular-nums",
            statusTextColors[location.healthStatus]
          )}
        >
          {location.healthScore ?? "—"}
        </span>
      </div>

      {/* Location Name */}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{location.name}</p>
        {(location.city || location.state) && (
          <p className="text-sm text-muted-foreground truncate">
            {[location.city, location.state].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      {/* Concept Type */}
      <div className="hidden w-32 text-sm text-muted-foreground md:block">
        {location.conceptType || "—"}
      </div>

      {/* Sales */}
      <div className="w-20 text-right">
        <p className="font-semibold tabular-nums">
          {formatCurrency(location.totalSalesMTD)}
        </p>
        <p className="text-xs text-muted-foreground">MTD</p>
      </div>

      {/* Trend */}
      <div
        className={cn(
          "flex w-16 items-center justify-end gap-1 text-sm font-medium",
          isPositive && "text-green-600",
          isNegative && "text-red-600",
          !isPositive && !isNegative && "text-muted-foreground"
        )}
      >
        {trend !== null ? (
          <>
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(trend).toFixed(1)}%
          </>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}
