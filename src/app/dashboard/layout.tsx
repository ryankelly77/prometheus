"use client";

import { useState, useEffect } from "react";
import { Sidebar, TopBar, MobileNav } from "@/components/navigation";
import { LocationProvider, type LocationData } from "@/hooks/use-location";
import {
  DemoProvider,
  DemoBanner,
  WalkthroughPanel,
  FeedbackModal,
} from "@/components/demo";
import { Toaster } from "@/components/ui/toaster";
import { OrganizationProvider, UserProvider } from "@/contexts";
import { Skeleton } from "@/components/ui/skeleton";

interface LocationsResponse {
  locations: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  }>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch locations from API
  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch("/api/locations/overview");
        if (!response.ok) {
          throw new Error("Failed to fetch locations");
        }
        const data: LocationsResponse = await response.json();

        // Convert API response to LocationData format
        const locationData: LocationData[] = data.locations.map((loc) => ({
          id: loc.id,
          name: loc.name,
          city: loc.city,
          state: loc.state,
          timezone: "America/Chicago", // Default timezone
          conceptType: null,
          isActive: true,
        }));

        setLocations(locationData);

        // Restore selected location from localStorage
        const savedId = localStorage.getItem("selectedLocationId");
        if (savedId) {
          const savedLocation = locationData.find((l) => l.id === savedId);
          if (savedLocation) {
            // Will be handled by LocationProvider
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching locations:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLocations();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error Loading Dashboard</p>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Determine default location
  const savedId = typeof window !== "undefined" ? localStorage.getItem("selectedLocationId") : null;
  const defaultLocation = savedId
    ? locations.find((l) => l.id === savedId) || locations[0] || null
    : locations[0] || null;

  return (
    <UserProvider>
      <OrganizationProvider>
        <LocationProvider locations={locations} defaultLocation={defaultLocation}>
          <DemoProvider>
            {/* Demo Banner - Fixed at top */}
            <DemoBanner />

            <div className="flex h-screen overflow-hidden bg-background pt-[40px]">
              {/* Desktop Sidebar */}
              <Sidebar className="hidden lg:flex" />

              {/* Main Content Area */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top Bar */}
                <TopBar />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
                  {children}
                </main>
              </div>

              {/* Mobile Bottom Navigation */}
              <MobileNav className="lg:hidden" />
            </div>

            {/* Demo Walkthrough Panel */}
            <WalkthroughPanel />

            {/* Feedback Modal */}
            <FeedbackModal />

            {/* Toast Notifications */}
            <Toaster />
          </DemoProvider>
        </LocationProvider>
      </OrganizationProvider>
    </UserProvider>
  );
}
