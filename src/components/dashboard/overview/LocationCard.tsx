"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface LocationData {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  conceptType: string | null;
  restaurantGroupName: string;
  healthScore: number | null;
  healthStatus: "excellent" | "good" | "warning" | "danger" | "unknown";
  totalSalesMTD: number | null;
  salesTrend: number | null;
}

interface LocationCardProps {
  location: LocationData;
  onClick: () => void;
}

const statusColors = {
  excellent: "bg-green-500 text-white",
  good: "bg-lime-500 text-white",
  warning: "bg-yellow-500 text-black",
  danger: "bg-red-500 text-white",
  unknown: "bg-muted text-muted-foreground",
};

const statusBorders = {
  excellent: "border-green-200 dark:border-green-900",
  good: "border-lime-200 dark:border-lime-900",
  warning: "border-yellow-200 dark:border-yellow-900",
  danger: "border-red-200 dark:border-red-900",
  unknown: "border-border",
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

function TrendIndicator({ trend }: { trend: number | null }) {
  if (trend === null) return <span className="text-muted-foreground">—</span>;

  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-sm font-medium",
        isPositive && "text-green-600",
        isNegative && "text-red-600",
        !isPositive && !isNegative && "text-muted-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(trend).toFixed(1)}%
    </span>
  );
}

export function LocationCard({ location, onClick }: LocationCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer p-4 transition-all hover:shadow-md hover:-translate-y-0.5",
        "border-l-4",
        statusBorders[location.healthStatus]
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{location.name}</h3>
          {(location.city || location.state) && (
            <p className="text-sm text-muted-foreground truncate">
              {[location.city, location.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Health Score Badge */}
        <div
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold",
            statusColors[location.healthStatus]
          )}
        >
          {location.healthScore ?? "—"}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xl font-bold tabular-nums">
            {formatCurrency(location.totalSalesMTD)}
          </p>
          <p className="text-xs text-muted-foreground">MTD Sales</p>
        </div>
        <TrendIndicator trend={location.salesTrend} />
      </div>

      {location.conceptType && (
        <p className="mt-3 text-xs text-muted-foreground truncate">
          {location.conceptType}
        </p>
      )}
    </Card>
  );
}
