import prisma from "@/lib/prisma";
import type { Location, UserOrganization, UserRole } from "@/generated/prisma";
import { hasMinimumRole } from "./types";

/**
 * Gets all location IDs accessible to a user based on their membership scope.
 *
 * Access scope rules (evaluated in order):
 * 1. SUPER_ADMIN, PARTNER_ADMIN → ALL locations in organization
 * 2. If both arrays empty → ALL locations in organization
 * 3. If restaurantGroupIds set → all locations in those groups
 * 4. If locationIds set → only those specific locations
 * 5. Can combine: groups + additional individual locations
 */
export async function getAccessibleLocationIds(
  membership: UserOrganization
): Promise<string[]> {
  const { organizationId, role, restaurantGroupIds, locationIds } = membership;

  // Admins get all locations
  if (hasMinimumRole(role, "PARTNER_ADMIN")) {
    const locations = await prisma.location.findMany({
      where: {
        restaurantGroup: { organizationId },
        isActive: true,
      },
      select: { id: true },
    });
    return locations.map((l) => l.id);
  }

  // Empty arrays = all locations
  if (restaurantGroupIds.length === 0 && locationIds.length === 0) {
    const locations = await prisma.location.findMany({
      where: {
        restaurantGroup: { organizationId },
        isActive: true,
      },
      select: { id: true },
    });
    return locations.map((l) => l.id);
  }

  // Build list from groups + individual locations
  const accessibleIds = new Set<string>(locationIds);

  if (restaurantGroupIds.length > 0) {
    const groupLocations = await prisma.location.findMany({
      where: {
        restaurantGroupId: { in: restaurantGroupIds },
        isActive: true,
      },
      select: { id: true },
    });
    groupLocations.forEach((l) => accessibleIds.add(l.id));
  }

  return Array.from(accessibleIds);
}

/**
 * Gets full location objects accessible to a user.
 */
export async function getAccessibleLocations(
  membership: UserOrganization
): Promise<Location[]> {
  const locationIds = await getAccessibleLocationIds(membership);

  return prisma.location.findMany({
    where: {
      id: { in: locationIds },
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
  });
}

/**
 * Checks if a user can access a specific location.
 */
export async function canAccessLocation(
  membership: UserOrganization,
  locationId: string
): Promise<boolean> {
  const accessibleIds = await getAccessibleLocationIds(membership);
  return accessibleIds.includes(locationId);
}

/**
 * Requires access to a specific location, returns the location or throws.
 */
export async function requireLocationAccess(
  membership: UserOrganization,
  locationId: string
): Promise<Location | null> {
  const canAccess = await canAccessLocation(membership, locationId);

  if (!canAccess) {
    return null;
  }

  return prisma.location.findUnique({
    where: { id: locationId },
  });
}

/**
 * Gets the default location for a user (first accessible location).
 * Used when no location is explicitly selected.
 */
export async function getDefaultLocation(
  membership: UserOrganization
): Promise<Location | null> {
  const locationIds = await getAccessibleLocationIds(membership);

  if (locationIds.length === 0) {
    return null;
  }

  // First try to find a location marked as default
  const defaultLocation = await prisma.location.findFirst({
    where: {
      id: { in: locationIds },
      isDefault: true,
      isActive: true,
    },
  });

  if (defaultLocation) {
    return defaultLocation;
  }

  // Otherwise return first location alphabetically
  return prisma.location.findFirst({
    where: {
      id: { in: locationIds },
      isActive: true,
    },
    orderBy: { name: "asc" },
  });
}
