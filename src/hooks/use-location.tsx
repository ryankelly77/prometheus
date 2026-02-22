"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Location } from "@/generated/prisma";

/**
 * Simplified location type for UI display.
 * Uses Prisma Location but can be extended for mock data compatibility.
 */
export type LocationData = Pick<
  Location,
  "id" | "name" | "city" | "state" | "timezone" | "conceptType" | "isActive"
>;

interface LocationContextType {
  /**
   * All locations the user has access to.
   */
  locations: LocationData[];
  /**
   * Currently selected location, or null for "All Locations" view.
   */
  currentLocation: LocationData | null;
  /**
   * Set the current location. Pass null for "All Locations" view.
   */
  setCurrentLocation: (location: LocationData | null) => void;
  /**
   * Whether "All Locations" view is active.
   */
  isAllLocations: boolean;
  /**
   * Find a location by ID.
   */
  getLocationById: (id: string) => LocationData | undefined;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
  /**
   * Locations the user has access to.
   */
  locations: LocationData[];
  /**
   * Default selected location. If null, starts with "All Locations" view.
   */
  defaultLocation?: LocationData | null;
}

/**
 * Provides location context for the dashboard.
 * Allows selecting between individual locations or "All Locations" view.
 */
export function LocationProvider({
  children,
  locations,
  defaultLocation = null,
}: LocationProviderProps) {
  const [currentLocation, setCurrentLocationState] = useState<LocationData | null>(
    defaultLocation
  );

  const setCurrentLocation = useCallback((location: LocationData | null) => {
    setCurrentLocationState(location);

    // Persist selection to localStorage
    if (typeof window !== "undefined") {
      if (location) {
        localStorage.setItem("selectedLocationId", location.id);
      } else {
        localStorage.removeItem("selectedLocationId");
      }
    }
  }, []);

  const getLocationById = useCallback(
    (id: string) => locations.find((loc) => loc.id === id),
    [locations]
  );

  const isAllLocations = currentLocation === null;

  const value = useMemo(
    () => ({
      locations,
      currentLocation,
      setCurrentLocation,
      isAllLocations,
      getLocationById,
    }),
    [locations, currentLocation, setCurrentLocation, isAllLocations, getLocationById]
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

/**
 * Hook to access location context.
 */
export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}

/**
 * Hook to get the current location ID, or null for all locations.
 */
export function useCurrentLocationId(): string | null {
  const { currentLocation } = useLocation();
  return currentLocation?.id ?? null;
}

/**
 * Hook to check if a specific location is selected.
 */
export function useIsLocationSelected(locationId: string): boolean {
  const { currentLocation } = useLocation();
  return currentLocation?.id === locationId;
}
