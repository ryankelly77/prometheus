'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { UserIntegrationCard, ManagedIntegrationCard, SocialChoiceCard } from './integration-card'
import { mockIntegrations, mockSocialPreference } from '@/lib/mock-data/settings'
import type { Integration, SocialMediaPreference } from '@/types/settings'

const USER_CATEGORY_CONFIG: Record<
  'pos' | 'accounting' | 'reservations',
  { label: string; description: string }
> = {
  pos: {
    label: 'Point of Sale',
    description: 'Connect your POS to pull sales, labor, and menu data.',
  },
  accounting: {
    label: 'Accounting & Inventory',
    description: 'Connect your back-office system for cost data.',
  },
  reservations: {
    label: 'Reservations & Guests',
    description: 'Connect your reservation system for guest data.',
  },
}

const MANAGED_CATEGORY_CONFIG: Record<
  'reviews' | 'seo',
  { label: string; description: string }
> = {
  reviews: {
    label: 'Reviews & Reputation',
    description: 'We monitor reviews across 80+ sites for you.',
  },
  seo: {
    label: 'SEO & Visibility',
    description: 'We track your search rankings and online visibility.',
  },
}

export function IntegrationsTab() {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations)
  const [socialPreference, setSocialPreference] = useState<SocialMediaPreference>(mockSocialPreference)
  const [comingSoonModal, setComingSoonModal] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  // Filter integrations by connection type
  const userIntegrations = integrations.filter((i) => i.connectionType === 'user')
  const managedIntegrations = integrations.filter((i) => i.connectionType === 'managed')
  const socialIntegrations = integrations.filter((i) => i.connectionType === 'choice')

  // Group user integrations by category
  const posIntegrations = userIntegrations.filter((i) => i.category === 'pos')
  const accountingIntegrations = userIntegrations.filter((i) => i.category === 'accounting')
  const reservationIntegrations = userIntegrations.filter((i) => i.category === 'reservations')

  // Group managed integrations by category
  const reviewsIntegrations = managedIntegrations.filter((i) => i.category === 'reviews')
  const seoIntegrations = managedIntegrations.filter((i) => i.category === 'seo')

  // Social integrations
  const metricool = socialIntegrations.find((i) => i.type === 'metricool')
  const sprout = socialIntegrations.find((i) => i.type === 'sprout')

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration)
    setComingSoonModal(true)
  }

  const handleReconnect = (integration: Integration) => {
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
          ? { ...i, status: 'available', lastSyncAt: undefined }
          : i
      )
    )
    toast({
      title: 'Disconnected',
      description: `${integration.name} has been disconnected.`,
    })
  }

  const handleViewData = (integration: Integration) => {
    const dataPages: Record<string, string> = {
      toast: '/dashboard/sales/data',
      square: '/dashboard/sales/data',
      r365: '/dashboard/costs/data',
      marginedge: '/dashboard/costs/data',
      opentable: '/dashboard/customers/data',
      resy: '/dashboard/customers/data',
      tock: '/dashboard/customers/data',
      brightlocal_reviews: '/dashboard/reviews/data',
      brightlocal_local: '/dashboard/visibility',
      semrush: '/dashboard/visibility',
      sprout: '/dashboard/social',
      metricool: '/dashboard/social',
    }
    const path = dataPages[integration.type]
    if (path) {
      window.location.href = path
    }
  }

  const handleSocialMethodChange = (method: 'managed' | 'byoa') => {
    setSocialPreference({ ...socialPreference, method })
    toast({
      title: 'Social tracking updated',
      description: method === 'managed'
        ? 'Using Prometheus Social Tracking (Metricool)'
        : 'Using your Sprout Social account',
    })
  }

  const handleConnectSprout = () => {
    setSelectedIntegration(sprout || null)
    setComingSoonModal(true)
  }

  return (
    <div className="space-y-6">
      {/* User-Connected Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect your data sources to power the dashboard. Data syncs automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* POS */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {USER_CATEGORY_CONFIG.pos.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {USER_CATEGORY_CONFIG.pos.description}
              </p>
            </div>
            <div className="space-y-3">
              {posIntegrations.map((integration) => (
                <UserIntegrationCard
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

          {/* Accounting */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {USER_CATEGORY_CONFIG.accounting.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {USER_CATEGORY_CONFIG.accounting.description}
              </p>
            </div>
            <div className="space-y-3">
              {accountingIntegrations.map((integration) => (
                <UserIntegrationCard
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

          {/* Reservations */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {USER_CATEGORY_CONFIG.reservations.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {USER_CATEGORY_CONFIG.reservations.description}
              </p>
            </div>
            <div className="space-y-3">
              {reservationIntegrations.map((integration) => (
                <UserIntegrationCard
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
        </CardContent>
      </Card>

      {/* Separator */}
      <Separator className="my-8" />

      {/* PRO Plan Features */}
      <Card className="border-amber-200/50 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            <CardTitle>Pro Plan Features</CardTitle>
          </div>
          <CardDescription>
            These integrations are managed by Prometheus and included with your Pro plan.
            No additional setup required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Reviews & Reputation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {MANAGED_CATEGORY_CONFIG.reviews.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {MANAGED_CATEGORY_CONFIG.reviews.description}
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <Star className="h-3 w-3 fill-current" />
                Pro Plan
              </span>
            </div>
            <div className="space-y-3">
              {reviewsIntegrations.map((integration) => (
                <ManagedIntegrationCard
                  key={integration.id}
                  integration={integration}
                  onViewData={handleViewData}
                />
              ))}
            </div>
          </div>

          {/* SEO & Visibility */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {MANAGED_CATEGORY_CONFIG.seo.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {MANAGED_CATEGORY_CONFIG.seo.description}
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <Star className="h-3 w-3 fill-current" />
                Pro Plan
              </span>
            </div>
            <div className="space-y-3">
              {seoIntegrations.map((integration) => (
                <ManagedIntegrationCard
                  key={integration.id}
                  integration={integration}
                  onViewData={handleViewData}
                />
              ))}
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Social Media
                </h3>
                <p className="text-sm text-muted-foreground">
                  Track your social media performance.
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <Star className="h-3 w-3 fill-current" />
                Pro Plan
              </span>
            </div>
            {metricool && sprout && (
              <SocialChoiceCard
                metricool={metricool}
                sprout={sprout}
                selectedMethod={socialPreference.method}
                onMethodChange={handleSocialMethodChange}
                onConnectSprout={handleConnectSprout}
                onViewData={handleViewData}
              />
            )}
          </div>
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
