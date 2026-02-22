import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/organizations/[slug]/branding
 * Get public branding information for an organization.
 * This is a public endpoint - no auth required.
 * Used by login page to show org branding.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  try {
    const organization = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        logoIconUrl: true,
        faviconUrl: true,
        primaryColor: true,
        accentColor: true,
        darkMode: true,
        ssoEnabled: true,
        requireSso: true,
        allowPublicSignup: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { branding: organization },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600",
        },
      }
    );
  } catch (error) {
    console.error("Get branding error:", error);
    return NextResponse.json(
      { error: "Failed to get branding" },
      { status: 500 }
    );
  }
}
