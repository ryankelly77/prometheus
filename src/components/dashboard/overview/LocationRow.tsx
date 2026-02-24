"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationData } from "./LocationCard";

interface LocationRowProps {
  location: LocationData;
  onClick: () => void;
}

const statusConfig = {
  excellent: {
    label: "Excellent",
    bgColor: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
  },
  good: {
    label: "Good",
    bgColor: "bg-lime-500",
    textColor: "text-lime-600 dark:text-lime-400",
  },
  warning: {
    label: "Warning",
    bgColor: "bg-yellow-500",
    textColor: "text-yellow-600 dark:text-yellow-400",
  },
  danger: {
    label: "Danger",
    bgColor: "bg-red-500",
    textColor: "text-red-600 dark:text-red-400",
  },
  unknown: {
    label: "No Data",
    bgColor: "bg-muted-foreground",
    textColor: "text-muted-foreground",
  },
};

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function LocationRow({ location, onClick }: LocationRowProps) {
  const config = statusConfig[location.healthStatus];
  const trend = location.salesTrend;
  const isPositive = trend !== null && trend > 0;
  const isNegative = trend !== null && trend < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <motion.div
      whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
      transition={{ duration: 0.15 }}
      className="flex cursor-pointer items-center gap-4 rounded-lg border bg-card px-4 py-4 transition-colors"
      onClick={onClick}
    >
      {/* Health Score */}
      <div className="flex items-center gap-3 w-24">
        <div
          className={cn(
            "h-3 w-3 rounded-full flex-shrink-0",
            config.bgColor
          )}
        />
        <span
          className={cn(
            "text-xl font-bold tabular-nums",
            config.textColor
          )}
        >
          {location.healthScore ?? "—"}
        </span>
      </div>

      {/* Location Name */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{location.name}</p>
        {(location.neighborhood || location.city || location.state) && (
          <p className="text-sm text-muted-foreground truncate">
            {location.neighborhood
              ? `${location.neighborhood} · ${[location.city, location.state].filter(Boolean).join(", ")}`
              : [location.city, location.state].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      {/* Concept Type */}
      <div className="hidden w-40 text-sm text-muted-foreground lg:block">
        {location.conceptType || "—"}
      </div>

      {/* Sales */}
      <div className="w-28 text-right">
        <p className="text-lg font-semibold tabular-nums">
          {formatCurrency(location.totalSalesMTD)}
        </p>
        <p className="text-xs text-muted-foreground">MTD Sales</p>
      </div>

      {/* Trend */}
      <div
        className={cn(
          "flex w-24 items-center justify-end gap-1.5 text-sm font-medium",
          isPositive && "text-green-600",
          isNegative && "text-red-600",
          !isPositive && !isNegative && "text-muted-foreground"
        )}
      >
        {trend !== null ? (
          <>
            <TrendIcon className="h-4 w-4" />
            <span className="tabular-nums">{Math.abs(trend).toFixed(1)}%</span>
          </>
        ) : (
          "—"
        )}
      </div>

      {/* Status Badge */}
      <div className="hidden sm:flex items-center gap-2 w-24">
        <span className={cn("text-sm font-medium", config.textColor)}>
          {config.label}
        </span>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </motion.div>
  );
}
