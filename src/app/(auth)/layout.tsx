import { cookies } from "next/headers";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { hexToHslString } from "@/lib/utils/colors";

interface AuthLayoutProps {
  children: React.ReactNode;
}

async function getOrganizationBranding() {
  const cookieStore = await cookies();
  const orgId = cookieStore.get("org_id")?.value;

  if (!orgId) {
    return null;
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        darkMode: true,
      },
    });
    return org;
  } catch {
    return null;
  }
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const branding = await getOrganizationBranding();

  // Generate CSS variables for white-label theming
  const brandingStyles = branding
    ? {
        "--brand-primary": hexToHslString(branding.primaryColor) || "239 84% 67%",
        "--brand-accent": hexToHslString(branding.accentColor) || "262 83% 58%",
      }
    : {};

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4"
      style={brandingStyles as React.CSSProperties}
    >
      {/* Logo */}
      <div className="mb-8">
        {branding?.logoUrl ? (
          <Image
            src={branding.logoUrl}
            alt={branding.name}
            width={180}
            height={48}
            className="h-12 w-auto"
            priority
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-xl font-bold text-primary-foreground">P</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">Prometheus</span>
          </div>
        )}
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        {branding ? (
          <>Powered by Prometheus</>
        ) : (
          <>Restaurant analytics and health scoring platform</>
        )}
      </p>
    </div>
  );
}
