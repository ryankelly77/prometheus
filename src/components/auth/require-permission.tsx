"use client";

import { type ReactNode } from "react";
import { useUser, useHasRole } from "@/contexts";
import type { UserRole } from "@/generated/prisma";

interface RequirePermissionProps {
  children: ReactNode;
  /**
   * Minimum role required to view the children.
   */
  role: UserRole;
  /**
   * Content to show when user doesn't have permission.
   * Defaults to null (hidden).
   */
  fallback?: ReactNode;
  /**
   * If true, shows a loading state while checking permissions.
   */
  showLoading?: boolean;
}

/**
 * Conditionally renders children based on user's role.
 * Use for hiding UI elements that require specific permissions.
 *
 * @example
 * ```tsx
 * <RequirePermission role="GROUP_ADMIN">
 *   <Button>Invite User</Button>
 * </RequirePermission>
 * ```
 */
export function RequirePermission({
  children,
  role,
  fallback = null,
  showLoading = false,
}: RequirePermissionProps) {
  const { isLoading } = useUser();
  const hasRole = useHasRole(role);

  if (isLoading && showLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-24 rounded bg-muted" />
      </div>
    );
  }

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Shows content only to admins (GROUP_ADMIN and above).
 */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RequirePermission role="GROUP_ADMIN" fallback={fallback}>
      {children}
    </RequirePermission>
  );
}

/**
 * Shows content only to partner admins and super admins.
 */
export function PartnerAdminOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RequirePermission role="PARTNER_ADMIN" fallback={fallback}>
      {children}
    </RequirePermission>
  );
}

/**
 * Shows content only to super admins.
 */
export function SuperAdminOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RequirePermission role="SUPER_ADMIN" fallback={fallback}>
      {children}
    </RequirePermission>
  );
}
