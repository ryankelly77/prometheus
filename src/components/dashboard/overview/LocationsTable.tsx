"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LocationRow } from "./LocationRow";
import { LocationData } from "./LocationCard";

interface GroupedLocations {
  [groupId: string]: {
    groupName: string;
    locations: LocationData[];
  };
}

interface LocationsTableProps {
  grouped: GroupedLocations;
  onLocationClick: (locationId: string) => void;
}

export function LocationsTable({ grouped, onLocationClick }: LocationsTableProps) {
  const groups = Object.entries(grouped);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
  if (groups.length === 1) {
    const [, group] = groups[0];
    return (
      <div className="space-y-2">
        {group.locations.map((location, index) => (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
          >
            <LocationRow
              location={location}
              onClick={() => onLocationClick(location.id)}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([groupId, group]) => {
        const isCollapsed = collapsedGroups.has(groupId);

        return (
          <div key={groupId} className="space-y-3">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(groupId)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted/50"
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
              <h2 className="text-lg font-semibold">{group.groupName}</h2>
              <span className="text-sm text-muted-foreground">
                ({group.locations.length} location{group.locations.length !== 1 ? "s" : ""})
              </span>
            </button>

            {/* Locations List */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  {group.locations.map((location, index) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                    >
                      <LocationRow
                        location={location}
                        onClick={() => onLocationClick(location.id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
