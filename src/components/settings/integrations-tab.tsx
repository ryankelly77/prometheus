'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { IntegrationCard } from './integration-card'
import { mockIntegrations } from '@/lib/mock-data/settings'
import type { Integration } from '@/types/settings'

const CATEGORY_LABELS: Record<Integration['category'], string> = {
  pos: 'Point of Sale',
  accounting: 'Accounting & Inventory',
  reservations: 'Reservations & Guests',
  reviews: 'Reviews & Reputation',
  seo: 'SEO & Visibility',
  social: 'Social Media',
}

const CATEGORY_ORDER: Integration['category'][] = [
  'pos',
  'accounting',
  'reservations',
  'reviews',
  'seo',
  'social',
]

export function IntegrationsTab() {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations)
  const [comingSoonModal, setComingSoonModal] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  // Group integrations by category
  const groupedIntegrations = CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = integrations.filter((i) => i.category === category)
      return acc
    },
    {} as Record<Integration['category'], Integration[]>
  )

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration)
    setComingSoonModal(true)
  }

  const handleReconnect = (integration: Integration) => {
    // Simulate reconnection
    toast({
      title: 'Reconnecting...',
      description: `Reconnecting to ${integration.name}...`,
    })
    setTimeout(() => {
      setIntegrations(
        integrations.map((i) =>
          i.id === integration.id
            ? { ...i, status: 'connected', lastSyncAt: new Date().toISOString() }
            : i
        )
      )
      toast({
        title: 'Connected',
        description: `Successfully reconnected to ${integration.name}.`,
      })
    }, 1500)
  }

  const handleDisconnect = (integration: Integration) => {
    setIntegrations(
      integrations.map((i) =>
        i.id === integration.id
          ? { ...i, status: 'disconnected', lastSyncAt: undefined }
          : i
      )
    )
    toast({
      title: 'Disconnected',
      description: `${integration.name} has been disconnected.`,
    })
  }

  const handleViewData = (integration: Integration) => {
    // Navigate to relevant data page based on integration type
    const dataPages: Record<string, string> = {
      toast: '/dashboard/sales/data',
      square: '/dashboard/sales/data',
      r365: '/dashboard/costs/data',
      opentable: '/dashboard/customers/data',
      resy: '/dashboard/customers/data',
      brightlocal: '/dashboard/reviews/data',
      semrush: '/dashboard/visibility',
      sprout: '/dashboard/social',
      metricool: '/dashboard/social',
    }
    const path = dataPages[integration.type]
    if (path) {
      window.location.href = path
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect your data sources to power the dashboard. Data syncs automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {CATEGORY_ORDER.map((category) => {
            const categoryIntegrations = groupedIntegrations[category]
            if (!categoryIntegrations || categoryIntegrations.length === 0) return null

            return (
              <div key={category} className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-3">
                  {categoryIntegrations.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onConnect={handleConnect}
                      onReconnect={handleReconnect}
                      onDisconnect={handleDisconnect}
                      onViewData={handleViewData}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Coming Soon Modal */}
      <Dialog open={comingSoonModal} onOpenChange={setComingSoonModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coming Soon</DialogTitle>
            <DialogDescription>
              {selectedIntegration && (
                <>
                  We&apos;ll help you connect {selectedIntegration.name} during your onboarding
                  session. This integration requires secure OAuth authentication that we&apos;ll
                  guide you through.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setComingSoonModal(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
