import { NextResponse } from "next/server";
import type { UserRole } from "@/generated/prisma";
import { requireOrganization } from "./require-organization";
import { hasMinimumRole, type AuthContext } from "./types";

/**
 * Requires an authenticated user with a minimum role level.
 *
 * Usage:
 * ```ts
 * const auth = await requireRole("GROUP_ADMIN");
 * if (auth instanceof NextResponse) return auth;
 * // User has GROUP_ADMIN, PARTNER_ADMIN, or SUPER_ADMIN role
 * ```
 */
export async function requireRole(
  minimumRole: UserRole
): Promise<AuthContext | NextResponse> {
  const auth = await requireOrganization();

  if (auth instanceof NextResponse) {
    return auth;
  }

  if (!hasMinimumRole(auth.membership.role, minimumRole)) {
    return NextResponse.json(
      {
        error: "Insufficient permissions",
        required: minimumRole,
        current: auth.membership.role,
      },
      { status: 403 }
    );
  }

  return auth;
}

/**
 * Checks if user has minimum role without returning error response.
 * Useful for conditional UI rendering.
 */
export async function checkRole(minimumRole: UserRole): Promise<boolean> {
  const result = await requireRole(minimumRole);
  return !(result instanceof NextResponse);
}
