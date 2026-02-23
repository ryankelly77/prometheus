import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isValidHex, normalizeHex } from "@/lib/utils/colors";
import { z } from "zod";

const updateBrandingSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  accentTextLight: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  logoUrl: z.string().url().nullable().optional(),
  logoIconUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
});

/**
 * GET /api/organizations/branding
 * Get current organization's branding settings.
 * Requires authentication.
 */
export async function GET() {
  const auth = await requireRole("VIEWER");
  if (auth instanceof NextResponse) return auth;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: auth.organization.id },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        logoIconUrl: true,
        faviconUrl: true,
        primaryColor: true,
        accentColor: true,
        accentTextLight: true,
        darkMode: true,
        customDomain: true,
        domainVerified: true,
      },
    });

    return NextResponse.json({ branding: organization });
  } catch (error) {
    console.error("Get branding error:", error);
    return NextResponse.json(
      { error: "Failed to get branding" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizations/branding
 * Update organization branding settings.
 * Requires PARTNER_ADMIN or higher.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireRole("PARTNER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const data = updateBrandingSchema.parse(body);

    // Validate and normalize colors
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.primaryColor !== undefined) {
      if (!isValidHex(data.primaryColor)) {
        return NextResponse.json(
          { error: "Invalid primary color format" },
          { status: 400 }
        );
      }
      updateData.primaryColor = normalizeHex(data.primaryColor);
    }

    if (data.accentColor !== undefined) {
      if (!isValidHex(data.accentColor)) {
        return NextResponse.json(
          { error: "Invalid accent color format" },
          { status: 400 }
        );
      }
      updateData.accentColor = normalizeHex(data.accentColor);
    }

    if (data.accentTextLight !== undefined) {
      updateData.accentTextLight = data.accentTextLight;
    }

    if (data.darkMode !== undefined) {
      updateData.darkMode = data.darkMode;
    }

    if (data.logoUrl !== undefined) {
      updateData.logoUrl = data.logoUrl;
    }

    if (data.logoIconUrl !== undefined) {
      updateData.logoIconUrl = data.logoIconUrl;
    }

    if (data.faviconUrl !== undefined) {
      updateData.faviconUrl = data.faviconUrl;
    }

    const organization = await prisma.organization.update({
      where: { id: auth.organization.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        logoIconUrl: true,
        faviconUrl: true,
        primaryColor: true,
        accentColor: true,
        accentTextLight: true,
        darkMode: true,
      },
    });

    return NextResponse.json({ branding: organization });
  } catch (error) {
    console.error("Update branding error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update branding" },
      { status: 500 }
    );
  }
}
