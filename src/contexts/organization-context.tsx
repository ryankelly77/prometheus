"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Organization } from "@/generated/prisma";

/**
 * Organization branding data for white-label theming.
 */
export interface OrganizationBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  logoIconUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  primaryTextLight: boolean;
  accentColor: string;
  accentTextLight: boolean;
  darkMode: boolean;
}

interface OrganizationContextType {
  organization: OrganizationBranding | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

interface OrganizationProviderProps {
  children: ReactNode;
  initialOrganization?: OrganizationBranding | null;
}

/**
 * Provides organization context for white-label branding.
 * Fetches organization branding from API or uses initial data from server.
 */
export function OrganizationProvider({
  children,
  initialOrganization = null,
}: OrganizationProviderProps) {
  const [organization, setOrganization] =
    useState<OrganizationBranding | null>(initialOrganization);
  const [isLoading, setIsLoading] = useState(!initialOrganization);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/organizations/branding");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          // Not authenticated, no org membership, or profile not found - clear org
          setOrganization(null);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch organization");
      }

      const data = await response.json();
      setOrganization(data.branding);
      // Cache branding in localStorage to prevent flash on next load
      if (data.branding) {
        try {
          localStorage.setItem('prometheus_branding', JSON.stringify(data.branding));
        } catch {
          // Ignore localStorage errors
        }
      }
    } catch (err) {
      console.error("Failed to fetch organization:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount if no initial data
  useEffect(() => {
    if (!initialOrganization) {
      fetchOrganization();
    }
  }, [initialOrganization, fetchOrganization]);

  // Apply branding CSS variables
  useEffect(() => {
    if (!organization) return;

    const root = document.documentElement;

    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string): string | null => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return null;

      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const primaryHsl = hexToHsl(organization.primaryColor);
    const accentHsl = hexToHsl(organization.accentColor);

    if (primaryHsl) {
      // Set primary color used by shadcn/ui components
      root.style.setProperty("--primary", primaryHsl);
      root.style.setProperty("--ring", primaryHsl);
      root.style.setProperty("--sidebar-primary", primaryHsl);
      root.style.setProperty("--sidebar-ring", primaryHsl);
      // Also set chart-1 which uses primary color
      root.style.setProperty("--chart-1", primaryHsl);
      // Keep brand-primary for any custom uses
      root.style.setProperty("--brand-primary", primaryHsl);
      // Set foreground color based on light/dark text preference
      const primaryFg = organization.primaryTextLight ? "0 0% 100%" : "0 0% 0%";
      root.style.setProperty("--primary-foreground", primaryFg);
      root.style.setProperty("--sidebar-primary-foreground", primaryFg);
    }
    if (accentHsl) {
      // Set accent color
      root.style.setProperty("--accent", accentHsl);
      root.style.setProperty("--sidebar-accent", accentHsl);
      root.style.setProperty("--brand-accent", accentHsl);
      // Set accent foreground based on light/dark text preference
      const accentFg = organization.accentTextLight ? "0 0% 100%" : "0 0% 0%";
      root.style.setProperty("--accent-foreground", accentFg);
      root.style.setProperty("--sidebar-accent-foreground", accentFg);
    }

    // Update favicon if provided
    if (organization.faviconUrl) {
      const link =
        document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
        document.createElement("link");
      link.rel = "icon";
      link.href = organization.faviconUrl;
      document.head.appendChild(link);
    }

    return () => {
      // Cleanup: remove custom properties
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-primary-foreground");
      root.style.removeProperty("--sidebar-ring");
      root.style.removeProperty("--chart-1");
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-foreground");
      root.style.removeProperty("--sidebar-accent");
      root.style.removeProperty("--sidebar-accent-foreground");
      root.style.removeProperty("--brand-accent");
    };
  }, [organization]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        isLoading,
        error,
        refetch: fetchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access organization context.
 */
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
}

/**
 * Hook to check if white-label branding is active.
 */
export function useIsBranded() {
  const { organization } = useOrganization();
  return !!organization?.logoUrl;
}
