import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware handles:
 * 1. Subdomain routing ({slug}.prometheus.app → resolve organization)
 * 2. Custom domain routing (custom.domain.com → resolve organization)
 * 3. Auth session refresh
 * 4. Protected route enforcement
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/accept-invite",
  "/select-organization",
];

// Routes that should be accessible without org context
const ORG_OPTIONAL_ROUTES = [
  "/api/internal",
  "/api/auth",
  "/api/webhooks",
  "/_next",
  "/favicon.ico",
];

// Main app domain (production vs development)
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "prometheus.app";
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  const response = NextResponse.next();

  // Skip static files and internal routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/internal") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // === 1. Resolve Organization ===
  let organizationSlug: string | null = null;
  let organizationId: string | null = null;
  let isCustomDomain = false;

  // First, check for org_id cookie (set after user selects org)
  const cookieOrgId = request.cookies.get("org_id")?.value;
  if (cookieOrgId) {
    organizationId = cookieOrgId;
  }

  if (IS_DEVELOPMENT) {
    // In development, also allow X-Organization-Slug header or org_slug cookie
    if (!organizationId) {
      organizationSlug =
        request.headers.get("X-Organization-Slug") ||
        request.cookies.get("org_slug")?.value ||
        null;
    }
  } else if (!organizationId) {
    // Production: Check subdomain or custom domain (only if no cookie)
    const hostParts = hostname.split(".");

    if (hostname.endsWith(MAIN_DOMAIN) && hostname !== MAIN_DOMAIN) {
      // Subdomain: {slug}.prometheus.app (but not the main domain itself)
      const subdomain = hostParts[0];
      if (subdomain && subdomain !== "www" && subdomain !== "app") {
        organizationSlug = subdomain;
      }
    } else if (!hostname.endsWith(MAIN_DOMAIN) && !hostname.includes("vercel.app")) {
      // Custom domain: resolve via API (skip vercel.app domains)
      isCustomDomain = true;
      const orgData = await resolveCustomDomain(hostname);
      if (orgData) {
        organizationId = orgData.id;
        organizationSlug = orgData.slug;
      }
    }
  }

  // Resolve slug to ID if we have slug but not ID
  if (organizationSlug && !organizationId) {
    const orgData = await resolveOrgBySlug(organizationSlug);
    if (orgData) {
      organizationId = orgData.id;
    }
  }

  // Set organization context headers for downstream use
  if (organizationId) {
    response.headers.set("X-Organization-Id", organizationId);
    response.headers.set("X-Organization-Slug", organizationSlug || "");

    // Set cookie for client-side access
    response.cookies.set("org_id", organizationId, {
      httpOnly: false,
      secure: !IS_DEVELOPMENT,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  // === 2. Supabase Session Refresh ===
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // === 3. Route Protection ===
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isOrgOptionalRoute = ORG_OPTIONAL_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes
  if (!user && !isPublicRoute && !isOrgOptionalRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Dashboard routes require organization context
  if (pathname.startsWith("/dashboard") && !organizationId && !IS_DEVELOPMENT) {
    // User is authenticated but no org context
    // This could redirect to org selector or show error
    return NextResponse.redirect(new URL("/select-organization", request.url));
  }

  return response;
}

/**
 * Resolves organization by slug via internal API.
 */
async function resolveOrgBySlug(
  slug: string
): Promise<{ id: string; slug: string } | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const secret = process.env.INTERNAL_API_SECRET;

    if (!secret) {
      console.error("INTERNAL_API_SECRET not configured");
      return null;
    }

    const res = await fetch(`${apiUrl}/api/internal/org-by-slug?slug=${slug}`, {
      headers: {
        "X-Internal-Secret": secret,
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to resolve org by slug:", error);
    return null;
  }
}

/**
 * Resolves organization by custom domain via internal API.
 */
async function resolveCustomDomain(
  domain: string
): Promise<{ id: string; slug: string } | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const secret = process.env.INTERNAL_API_SECRET;

    if (!secret) {
      console.error("INTERNAL_API_SECRET not configured");
      return null;
    }

    const res = await fetch(
      `${apiUrl}/api/internal/org-by-domain?domain=${domain}`,
      {
        headers: {
          "X-Internal-Secret": secret,
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to resolve custom domain:", error);
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
