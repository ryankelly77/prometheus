"use client";

import { useLocation } from "@/hooks/use-location";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const { currentLocation } = useLocation();

  if (!currentLocation) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No location selected</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/overview">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Overview
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/dashboard/overview">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{currentLocation.name} Reports</h1>
          <p className="text-muted-foreground">
            Detailed charts and KPIs
          </p>
        </div>
      </div>

      {/* Dashboard Content with all the charts */}
      <DashboardContent locationId={currentLocation.id} />
    </div>
  );
}
