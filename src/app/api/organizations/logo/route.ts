import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * POST /api/organizations/logo
 * Upload organization logo to Supabase Storage.
 * Requires PARTNER_ADMIN or higher.
 *
 * Request body: FormData with:
 * - file: The image file
 * - type: "logo" | "icon" | "favicon"
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole("PARTNER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!type || !["logo", "icon", "favicon"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'logo', 'icon', or 'favicon'" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPEG, WebP, SVG" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "png";
    const filename = `${auth.organization.id}/${type}-${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const supabase = await createClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("organization-assets")
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("organization-assets").getPublicUrl(uploadData.path);

    // Update organization with new URL
    const updateField =
      type === "logo"
        ? "logoUrl"
        : type === "icon"
          ? "logoIconUrl"
          : "faviconUrl";

    const organization = await prisma.organization.update({
      where: { id: auth.organization.id },
      data: { [updateField]: publicUrl },
      select: {
        logoUrl: true,
        logoIconUrl: true,
        faviconUrl: true,
      },
    });

    return NextResponse.json({
      url: publicUrl,
      ...organization,
    });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/logo
 * Remove organization logo.
 * Requires PARTNER_ADMIN or higher.
 *
 * Query params:
 * - type: "logo" | "icon" | "favicon"
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireRole("PARTNER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["logo", "icon", "favicon"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'logo', 'icon', or 'favicon'" },
        { status: 400 }
      );
    }

    const updateField =
      type === "logo"
        ? "logoUrl"
        : type === "icon"
          ? "logoIconUrl"
          : "faviconUrl";

    // Get current URL to delete from storage
    const currentOrg = await prisma.organization.findUnique({
      where: { id: auth.organization.id },
      select: {
        logoUrl: true,
        logoIconUrl: true,
        faviconUrl: true,
      },
    });

    const currentUrl =
      type === "logo"
        ? currentOrg?.logoUrl
        : type === "icon"
          ? currentOrg?.logoIconUrl
          : currentOrg?.faviconUrl;

    // Delete from storage if exists
    if (currentUrl && currentUrl.includes("organization-assets")) {
      const supabase = await createClient();
      const path = currentUrl.split("organization-assets/")[1];
      if (path) {
        await supabase.storage.from("organization-assets").remove([path]);
      }
    }

    // Clear URL in database
    const organization = await prisma.organization.update({
      where: { id: auth.organization.id },
      data: { [updateField]: null },
      select: {
        logoUrl: true,
        logoIconUrl: true,
        faviconUrl: true,
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Logo delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete logo" },
      { status: 500 }
    );
  }
}
