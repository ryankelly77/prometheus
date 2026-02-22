"use client";

import { type ReactNode, useMemo } from "react";
import { useUser } from "@/contexts";
import { useLocation } from "@/hooks/use-location";

interface RequireLocationAccessProps {
  children: ReactNode;
  /**
   * Location ID to check access for.
   * If not provided, checks current location from context.
   */
  locationId?: string;
  /**
   * Content to show when user doesn't have access.
   */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user's location access.
 * Uses the user's membership scope to determine access.
 *
 * @example
 * ```tsx
 * <RequireLocationAccess locationId={location.id}>
 *   <LocationSettings />
 * </RequireLocationAccess>
 * ```
 */
export function RequireLocationAccess({
  children,
  locationId,
  fallback = null,
}: RequireLocationAccessProps) {
  const { user, isLoading: userLoading } = useUser();
  const { currentLocation, locations } = useLocation();

  const targetLocationId = locationId ?? currentLocation?.id;

  const hasAccess = useMemo(() => {
    if (!user || !targetLocationId) return false;

    const { role, restaurantGroupIds, locationIds } = user.membership;

    // Admins have access to all locations
    if (role === "SUPER_ADMIN" || role === "PARTNER_ADMIN") {
      return true;
    }

    // Check if location is in user's accessible locations
    // (This is determined by the locations loaded in context)
    const accessibleLocationIds = locations.map((l) => l.id);
    return accessibleLocationIds.includes(targetLocationId);
  }, [user, targetLocationId, locations]);

  if (userLoading) {
    return null;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to check if user can access a specific location.
 */
export function useCanAccessLocation(locationId: string): boolean {
  const { user } = useUser();
  const { locations } = useLocation();

  return useMemo(() => {
    if (!user) return false;

    const { role } = user.membership;

    // Admins have access to all locations
    if (role === "SUPER_ADMIN" || role === "PARTNER_ADMIN") {
      return true;
    }

    // Check if location is in accessible locations
    return locations.some((l) => l.id === locationId);
  }, [user, locationId, locations]);
}

/**
 * Hook to check if user can edit a specific location's settings.
 */
export function useCanEditLocation(locationId: string): boolean {
  const { user } = useUser();
  const { locations } = useLocation();

  return useMemo(() => {
    if (!user) return false;

    const { role } = user.membership;

    // Only admins can edit locations
    if (role === "VIEWER") return false;

    // Admins have access to all locations
    if (role === "SUPER_ADMIN" || role === "PARTNER_ADMIN" || role === "GROUP_ADMIN") {
      return true;
    }

    // Location managers can only edit their assigned locations
    if (role === "LOCATION_MANAGER") {
      return locations.some((l) => l.id === locationId);
    }

    return false;
  }, [user, locationId, locations]);
}
