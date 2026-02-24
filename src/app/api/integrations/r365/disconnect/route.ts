import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { revokeR365Credentials } from "@/lib/integrations/r365/auth";

const disconnectSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
});

/**
 * POST /api/integrations/r365/disconnect
 * Disconnect R365 integration
 */
export async function POST(request: NextRequest) {
  try {
    // Require GROUP_ADMIN or higher
    const auth = await requireRole("GROUP_ADMIN");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { integrationId } = disconnectSchema.parse(body);

    // Get integration and verify ownership
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        location: {
          include: {
            restaurantGroup: true,
          },
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.location.restaurantGroup.organizationId !== auth.membership.organizationId) {
      return NextResponse.json(
        { error: "Integration does not belong to your organization" },
        { status: 403 }
      );
    }

    if (integration.type !== "R365") {
      return NextResponse.json(
        { error: "Integration is not R365" },
        { status: 400 }
      );
    }

    // Revoke credentials and update status
    await revokeR365Credentials(integrationId);

    return NextResponse.json({
      success: true,
      message: "R365 integration disconnected",
    });
  } catch (error) {
    console.error("R365 disconnect error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to disconnect R365" },
      { status: 500 }
    );
  }
}
