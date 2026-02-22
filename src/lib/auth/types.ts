import type { Organization, UserProfile, UserOrganization, UserRole } from "@/generated/prisma";

/**
 * Authenticated user context returned by requireOrganization().
 * Contains user, organization membership, and organization details.
 */
export interface AuthContext {
  user: UserProfile;
  membership: UserOrganization;
  organization: Organization;
}

/**
 * Role hierarchy for permission checks.
 * Higher index = more permissions.
 */
export const ROLE_HIERARCHY: UserRole[] = [
  "VIEWER",
  "LOCATION_MANAGER",
  "GROUP_ADMIN",
  "PARTNER_ADMIN",
  "SUPER_ADMIN",
];

/**
 * Gets the hierarchy level of a role (0-4).
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Checks if a role meets a minimum required role.
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(minimumRole);
}
