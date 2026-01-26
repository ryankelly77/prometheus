'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  MapPin,
  Plug,
  Users,
  Bell,
  CreditCard,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SettingsTab } from '@/types/settings'

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

interface SettingsTabsProps {
  activeTab: SettingsTab
}

export function SettingsTabs({ activeTab }: SettingsTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`/dashboard/settings?${params.toString()}`)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 rounded-lg border border-transparent bg-muted/50 px-4 py-2 data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
