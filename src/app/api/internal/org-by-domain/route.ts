import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Internal API: Resolve organization by custom domain.
 * Called by middleware for custom domain routing.
 *
 * Security: Requires INTERNAL_API_SECRET header.
 */
export async function GET(request: NextRequest) {
  // Verify internal secret
  const secret = request.headers.get("X-Internal-Secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get domain from query
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json(
      { error: "Missing domain parameter" },
      { status: 400 }
    );
  }

  try {
    const organization = await prisma.organization.findFirst({
      where: {
        customDomain: domain,
        domainVerified: true, // Only return verified domains
      },
      select: {
        id: true,
        slug: true,
        name: true,
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
        { error: "Organization not found for domain" },
        { status: 404 }
      );
    }

    return NextResponse.json(organization, {
      headers: {
        "Cache-Control": "private, max-age=300", // 5 minute cache
      },
    });
  } catch (error) {
    console.error("Error resolving org by domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
