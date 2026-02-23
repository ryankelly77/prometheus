'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  SettingsTabs,
  GeneralTab,
  BrandingTab,
  LocationsTab,
  IntegrationsTab,
  TeamTab,
  NotificationsTab,
  BillingTab,
} from '@/components/settings'
import type { SettingsTab } from '@/types/settings'

function SettingsContent() {
  const searchParams = useSearchParams()
  const tab = (searchParams.get('tab') as SettingsTab) || 'general'

  const renderTabContent = () => {
    switch (tab) {
      case 'general':
        return <GeneralTab />
      case 'branding':
        return <BrandingTab />
      case 'locations':
        return <LocationsTab />
      case 'integrations':
        return <IntegrationsTab />
      case 'team':
        return <TeamTab />
      case 'notifications':
        return <NotificationsTab />
      case 'billing':
        return <BillingTab />
      default:
        return <GeneralTab />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, locations, integrations, team, and preferences.
        </p>
      </div>

      <SettingsTabs activeTab={tab} />

      <div className="mt-6">{renderTabContent()}</div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}
