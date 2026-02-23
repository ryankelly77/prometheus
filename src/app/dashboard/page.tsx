'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocation } from '@/hooks/use-location'
import { DashboardContent } from '@/components/dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const router = useRouter()
  const { locations, currentLocation } = useLocation()

  // For multi-location accounts, redirect to overview
  useEffect(() => {
    if (locations.length > 1) {
      router.replace('/dashboard/overview')
    }
  }, [locations.length, router])

  // Multi-location: will redirect (show skeleton while redirecting)
  if (locations.length > 1) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  // Single location: show dashboard content
  if (!currentLocation) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">No Location Available</p>
          <p className="text-muted-foreground">Please contact support to set up your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header for single-location */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Performance for {currentLocation.name}
        </p>
      </div>

      <DashboardContent locationId={currentLocation.id} />
    </div>
  )
}
