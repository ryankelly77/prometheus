"use client";

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
import { mockLocations } from "@/lib/mock-data";

// Convert mock locations to LocationData format
const locations: LocationData[] = mockLocations.map((loc) => ({
  id: loc.id,
  name: loc.name,
  city: null,
  state: null,
  timezone: loc.timezone,
  conceptType: loc.cuisineType,
  isActive: true,
}));

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <OrganizationProvider>
        <LocationProvider locations={locations} defaultLocation={locations[0]}>
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
