"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, SortAsc } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  OverviewSummaryBar,
  OverviewInsights,
  ViewToggle,
  ViewMode,
  LocationsGrid,
  LocationsTable,
  LocationData,
} from "@/components/dashboard/overview";

interface SummaryStats {
  total: number;
  excellent: number;
  good: number;
  warning: number;
  danger: number;
  unknown: number;
}

interface GroupedLocations {
  [groupId: string]: {
    groupName: string;
    locations: LocationData[];
  };
}

interface OverviewData {
  locations: LocationData[];
  grouped: GroupedLocations;
  summary: SummaryStats;
}

type SortOption = "score" | "sales" | "name" | "trend";

const VIEW_MODE_KEY = "prometheus-overview-view-mode";

export default function OverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Load view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === "cards" || saved === "list") {
      setViewMode(saved);
    }
  }, []);

  // Save view mode to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/locations/overview");
        if (!response.ok) {
          throw new Error("Failed to fetch locations");
        }
        const result = await response.json();
        setData(result);

        // Redirect to dashboard if only one location
        if (result.locations.length === 1) {
          router.replace(`/dashboard?location=${result.locations[0].id}`);
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [router]);

  // Filter and sort locations
  const filteredAndSortedGrouped = useMemo(() => {
    if (!data) return null;

    const query = searchQuery.toLowerCase().trim();
    const result: GroupedLocations = {};

    for (const [groupId, group] of Object.entries(data.grouped)) {
      let locations = [...group.locations];

      // Filter by search query
      if (query) {
        locations = locations.filter(
          (loc) =>
            loc.name.toLowerCase().includes(query) ||
            loc.city?.toLowerCase().includes(query) ||
            loc.state?.toLowerCase().includes(query)
        );
      }

      // Sort locations
      locations.sort((a, b) => {
        switch (sortBy) {
          case "score":
            return (b.healthScore ?? -1) - (a.healthScore ?? -1);
          case "sales":
            return (b.totalSalesMTD ?? -1) - (a.totalSalesMTD ?? -1);
          case "name":
            return a.name.localeCompare(b.name);
          case "trend":
            return (b.salesTrend ?? -999) - (a.salesTrend ?? -999);
          default:
            return 0;
        }
      });

      if (locations.length > 0) {
        result[groupId] = {
          groupName: group.groupName,
          locations,
        };
      }
    }

    return result;
  }, [data, searchQuery, sortBy]);

  const handleLocationClick = (locationId: string) => {
    router.push(`/dashboard?location=${locationId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !filteredAndSortedGrouped) {
    return null;
  }

  const hasResults = Object.keys(filteredAndSortedGrouped).length > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">
          Health scores and performance across all locations
        </p>
      </div>

      {/* Summary Bar */}
      <OverviewSummaryBar summary={data.summary} />

      {/* Insights */}
      <OverviewInsights locations={data.locations} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px]">
            <SortAsc className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Health Score</SelectItem>
            <SelectItem value="sales">MTD Sales</SelectItem>
            <SelectItem value="trend">Sales Trend</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <ViewToggle value={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* Locations */}
      {hasResults ? (
        viewMode === "cards" ? (
          <LocationsGrid
            grouped={filteredAndSortedGrouped}
            onLocationClick={handleLocationClick}
          />
        ) : (
          <LocationsTable
            grouped={filteredAndSortedGrouped}
            onLocationClick={handleLocationClick}
          />
        )
      ) : (
        <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
          No locations match your search
        </div>
      )}
    </div>
  );
}
