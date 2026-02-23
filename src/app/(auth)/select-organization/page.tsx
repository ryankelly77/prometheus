"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Building2, ChevronRight, LogOut } from "lucide-react";

interface OrganizationMembership {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: string;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  PARTNER_ADMIN: "Partner Admin",
  GROUP_ADMIN: "Group Admin",
  LOCATION_MANAGER: "Location Manager",
  VIEWER: "Viewer",
};

export default function SelectOrganizationPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          router.push("/login");
          return;
        }

        const data = await response.json();
        setOrganizations(data.user.organizations || []);
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizations();
  }, [router]);

  const handleSelect = async (org: OrganizationMembership) => {
    setIsSelecting(org.id);

    // Set the org_id cookie
    document.cookie = `org_id=${org.id}; path=/; max-age=${60 * 60 * 24 * 30}`;

    // Redirect to dashboard
    router.push("/dashboard");
    router.refresh();
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (organizations.length === 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">No Organizations</CardTitle>
          <CardDescription>
            You don&apos;t have access to any organizations yet. Please contact
            your administrator to get an invitation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If only one org, redirect immediately
  if (organizations.length === 1) {
    handleSelect(organizations[0]);
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Select Organization</CardTitle>
        <CardDescription>
          Choose which organization you want to access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => handleSelect(org)}
            disabled={isSelecting !== null}
            className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
          >
            {org.logoUrl ? (
              <Image
                src={org.logoUrl}
                alt={org.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium">{org.name}</p>
              <p className="text-sm text-muted-foreground">
                {roleLabels[org.role] || org.role}
              </p>
            </div>
            {isSelecting === org.id ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        ))}

        <div className="pt-4 text-center">
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
