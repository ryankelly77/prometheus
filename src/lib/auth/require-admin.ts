import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import type { UserProfile } from "@/generated/prisma";

/**
 * Requires SUPER_ADMIN role across any organization.
 * Used for the admin panel that manages all organizations.
 *
 * Unlike requireRole("SUPER_ADMIN"), this checks if the user
 * has SUPER_ADMIN in ANY organization, not just the current one.
 *
 * Usage:
 * ```ts
 * const admin = await requireAdmin();
 * if (admin instanceof NextResponse) return admin;
 * // admin.user is the UserProfile
 * ```
 */
export async function requireAdmin(): Promise<
  { user: UserProfile } | NextResponse
> {
  const supabaseUser = await getUser();

  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has SUPER_ADMIN role in any organization
  const adminMembership = await prisma.userOrganization.findFirst({
    where: {
      userId: supabaseUser.id,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    include: {
      user: true,
    },
  });

  if (!adminMembership) {
    return NextResponse.json(
      { error: "Super admin access required" },
      { status: 403 }
    );
  }

  // Update last access
  prisma.userOrganization
    .update({
      where: { id: adminMembership.id },
      data: { lastAccessAt: new Date() },
    })
    .catch(() => {});

  return { user: adminMembership.user };
}

/**
 * Checks if current user is a super admin.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const result = await requireAdmin();
  return !(result instanceof NextResponse);
}
