"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface LocationData {
  id: string;
  name: string;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  conceptType: string | null;
  restaurantGroupName: string;
  healthScore: number | null;
  healthStatus: "excellent" | "good" | "warning" | "danger" | "unknown";
  totalSalesMTD: number | null;
  salesTrend: number | null;
  priorMonthSales?: number | null;
  primeCost?: number | null;
  laborPercent?: number | null;
}

interface LocationCardProps {
  location: LocationData;
  onClick: () => void;
}

const statusConfig = {
  excellent: {
    label: "Excellent",
    color: "hsl(142, 76%, 36%)", // --health-excellent
    bgClass: "bg-green-500/10",
    textClass: "text-green-600 dark:text-green-400",
    dotClass: "bg-green-500",
    borderClass: "border-l-green-500",
  },
  good: {
    label: "Good",
    color: "hsl(84, 81%, 44%)", // --health-good
    bgClass: "bg-lime-500/10",
    textClass: "text-lime-600 dark:text-lime-400",
    dotClass: "bg-lime-500",
    borderClass: "border-l-lime-500",
  },
  warning: {
    label: "Warning",
    color: "hsl(48, 96%, 53%)", // --health-warning
    bgClass: "bg-yellow-500/10",
    textClass: "text-yellow-600 dark:text-yellow-400",
    dotClass: "bg-yellow-500",
    borderClass: "border-l-yellow-500",
  },
  danger: {
    label: "Danger",
    color: "hsl(0, 84%, 60%)", // --health-danger
    bgClass: "bg-red-500/10",
    textClass: "text-red-600 dark:text-red-400",
    dotClass: "bg-red-500",
    borderClass: "border-l-red-500",
  },
  unknown: {
    label: "No Data",
    color: "hsl(215, 16%, 47%)",
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground",
    borderClass: "border-l-muted-foreground",
  },
};

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function CircularProgress({
  score,
  status,
}: {
  score: number | null;
  status: LocationData["healthStatus"];
}) {
  const config = statusConfig[status];
  const size = 88;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cappedScore = Math.min(score ?? 0, 100);
  const progress = cappedScore / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        {score !== null && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}
        {/* Filled center with subtle color */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth}
          className={score !== null ? config.bgClass : "fill-muted/30"}
          style={{ fill: score !== null ? undefined : "hsl(var(--muted) / 0.3)" }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-2xl font-bold tabular-nums", config.textClass)}>
          {score ?? "—"}
        </span>
      </div>
    </div>
  );
}

export function LocationCard({ location, onClick }: LocationCardProps) {
  const config = statusConfig[location.healthStatus];
  const trend = location.salesTrend;
  const isPositive = trend !== null && trend > 0;
  const isNegative = trend !== null && trend < 0;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-shadow hover:shadow-lg border-l-4",
          config.borderClass
        )}
        onClick={onClick}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-4">
            <h3 className="font-semibold text-base truncate">{location.name}</h3>
            {(location.neighborhood || location.city || location.state) && (
              <p className="text-sm text-muted-foreground truncate">
                {location.neighborhood
                  ? `${location.neighborhood} · ${[location.city, location.state].filter(Boolean).join(", ")}`
                  : [location.city, location.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Main content - Score + Metrics side by side */}
          <div className="flex items-start gap-5">
            {/* Circular Progress */}
            <CircularProgress
              score={location.healthScore}
              status={location.healthStatus}
            />

            {/* Metrics */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Sales */}
              <div>
                <p className="text-2xl font-bold tabular-nums tracking-tight">
                  {formatCurrency(location.totalSalesMTD)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">MTD</span>
                  {trend !== null && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-semibold",
                        isPositive && "text-green-600",
                        isNegative && "text-red-600",
                        !isPositive && !isNegative && "text-muted-foreground"
                      )}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : isNegative ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {isPositive && "+"}
                      {trend.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Cost metrics */}
              <div className="flex gap-4 text-sm pt-1">
                {location.primeCost !== null && (
                  <div>
                    <span className="text-muted-foreground text-xs">Prime</span>
                    <p className="font-semibold tabular-nums">
                      {location.primeCost}%
                    </p>
                  </div>
                )}
                {location.laborPercent !== null && (
                  <div>
                    <span className="text-muted-foreground text-xs">Labor</span>
                    <p className="font-semibold tabular-nums">
                      {location.laborPercent}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
              <span className={cn("text-sm font-medium", config.textClass)}>
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span>View</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
