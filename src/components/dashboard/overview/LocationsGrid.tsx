"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationCard, LocationData } from "./LocationCard";

interface GroupedLocations {
  [groupId: string]: {
    groupName: string;
    locations: LocationData[];
  };
}

interface LocationsGridProps {
  grouped: GroupedLocations;
  onLocationClick: (locationId: string) => void;
}

export function LocationsGrid({ grouped, onLocationClick }: LocationsGridProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const groupIds = Object.keys(grouped);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // If only one group, don't show group headers
  const showGroupHeaders = groupIds.length > 1;

  if (!showGroupHeaders && groupIds.length === 1) {
    const group = grouped[groupIds[0]];
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {group.locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            onClick={() => onLocationClick(location.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupIds.map((groupId) => {
        const group = grouped[groupId];
        const isCollapsed = collapsedGroups.has(groupId);

        return (
          <div key={groupId}>
            {/* Group Header */}
            <button
              className="mb-3 flex w-full items-center gap-2 text-left"
              onClick={() => toggleGroup(groupId)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="font-semibold">{group.groupName}</h3>
              <span className="text-sm text-muted-foreground">
                ({group.locations.length})
              </span>
            </button>

            {/* Locations Grid */}
            <div
              className={cn(
                "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-all",
                isCollapsed && "hidden"
              )}
            >
              {group.locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  onClick={() => onLocationClick(location.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
