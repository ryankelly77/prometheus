import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import type { AuthContext } from "./types";

/**
 * Requires an authenticated user with organization membership.
 *
 * For API routes:
 * ```ts
 * const auth = await requireOrganization();
 * if (auth instanceof NextResponse) return auth;
 * // auth is AuthContext
 * ```
 *
 * Organization is determined by:
 * 1. X-Organization-Id header (for multi-org users)
 * 2. org_id cookie (sticky selection)
 * 3. First active organization membership
 */
export async function requireOrganization(): Promise<AuthContext | NextResponse> {
  // Get authenticated Supabase user
  const supabaseUser = await getUser();

  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile with organization memberships
  const userProfile = await prisma.userProfile.findUnique({
    where: { id: supabaseUser.id },
    include: {
      userOrganizations: {
        where: { isActive: true },
        include: { organization: true },
      },
    },
  });

  if (!userProfile) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 404 }
    );
  }

  if (userProfile.userOrganizations.length === 0) {
    return NextResponse.json(
      { error: "No organization membership" },
      { status: 403 }
    );
  }

  // Determine which organization to use
  let membership = userProfile.userOrganizations[0];

  // Check for explicit org selection via header
  const cookieStore = await cookies();
  const orgIdHeader =
    cookieStore.get("X-Organization-Id")?.value ||
    cookieStore.get("org_id")?.value;

  if (orgIdHeader) {
    const selectedMembership = userProfile.userOrganizations.find(
      (uo) => uo.organizationId === orgIdHeader
    );
    if (selectedMembership) {
      membership = selectedMembership;
    }
  }

  // Update last access timestamp (fire and forget)
  prisma.userOrganization
    .update({
      where: { id: membership.id },
      data: { lastAccessAt: new Date() },
    })
    .catch(() => {
      // Ignore errors - this is non-critical
    });

  return {
    user: userProfile,
    membership,
    organization: membership.organization,
  };
}

/**
 * Gets auth context or returns null (for optional auth scenarios).
 */
export async function getOrganization(): Promise<AuthContext | null> {
  const result = await requireOrganization();
  if (result instanceof NextResponse) {
    return null;
  }
  return result;
}
