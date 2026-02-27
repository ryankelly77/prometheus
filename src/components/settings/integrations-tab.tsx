'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
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
import { ToastConnectModal } from './toast-connect-modal'
import { ToastSyncModal } from './toast-sync-modal'
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
  const { currentLocation } = useLocation()
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations)
  const [socialPreference, setSocialPreference] = useState<SocialMediaPreference>(mockSocialPreference)
  const [comingSoonModal, setComingSoonModal] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [toastModalOpen, setToastModalOpen] = useState(false)
  const [toastSyncModalOpen, setToastSyncModalOpen] = useState(false)
  const [toastSyncIntegrationId, setToastSyncIntegrationId] = useState<string | null>(null)
  const [toastSyncLocationName, setToastSyncLocationName] = useState<string | undefined>(undefined)

  // Fetch real integration status for the current location
  useEffect(() => {
    async function fetchRealIntegrationStatus() {
      // Use currentLocation if set, otherwise try to fetch for all locations
      const locationId = currentLocation?.id

      if (!locationId) {
        // If no specific location selected, try to fetch locations and use first one
        try {
          const locResponse = await fetch('/api/locations')
          const locData = await locResponse.json()
          if (locData.locations && locData.locations.length > 0) {
            const firstLocationId = locData.locations[0].id
            const firstLocationName = locData.locations[0].name

            // Fetch Toast status for first location
            const toastResponse = await fetch(`/api/integrations/toast/status?locationId=${firstLocationId}`)
            const toastData = await toastResponse.json()

            if (toastData.success) {
              setIntegrations((prev) =>
                prev.map((i) =>
                  i.type === 'toast'
                    ? {
                        ...i,
                        status: toastData.isConnected ? 'connected' : 'available',
                        lastSyncAt: toastData.lastSyncAt ?? undefined,
                        connectedLocationName: toastData.restaurantName ?? firstLocationName,
                      }
                    : i
                )
              )

              if (toastData.integrationId) {
                setToastSyncIntegrationId(toastData.integrationId)
                setToastSyncLocationName(toastData.restaurantName ?? firstLocationName)
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch locations:', error)
        }
        return
      }

      try {
        // Fetch Toast integration status
        const toastResponse = await fetch(`/api/integrations/toast/status?locationId=${locationId}`)
        const toastData = await toastResponse.json()

        if (toastData.success) {
          setIntegrations((prev) =>
            prev.map((i) =>
              i.type === 'toast'
                ? {
                    ...i,
                    status: toastData.isConnected ? 'connected' : 'available',
                    lastSyncAt: toastData.lastSyncAt ?? undefined,
                    connectedLocationName: toastData.restaurantName ?? currentLocation.name,
                  }
                : i
            )
          )

          // Store the real integration ID for sync operations
          if (toastData.integrationId) {
            setToastSyncIntegrationId(toastData.integrationId)
            setToastSyncLocationName(toastData.restaurantName ?? currentLocation.name)
          }
        }
      } catch (error) {
        console.error('Failed to fetch integration status:', error)
      }
    }

    fetchRealIntegrationStatus()
  }, [currentLocation?.id, currentLocation?.name])

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

    // Open integration-specific modals
    if (integration.type === 'toast') {
      setToastModalOpen(true)
      return
    }

    // Default to coming soon modal for other integrations
    setComingSoonModal(true)
  }

  const handleToastConnectSuccess = (integrationId: string, locationName: string) => {
    // Update the Toast integration status in local state
    setIntegrations(
      integrations.map((i) =>
        i.type === 'toast'
          ? {
              ...i,
              status: 'connected',
              lastSyncAt: new Date().toISOString(),
              connectedLocationName: locationName,
            }
          : i
      )
    )
  }

  const handleAddConnection = (integration: Integration) => {
    // For Toast, open the connect modal to add another location
    if (integration.type === 'toast') {
      setSelectedIntegration(integration)
      setToastModalOpen(true)
    }
  }

  const handleReconnect = async (integration: Integration) => {
    // For Toast, open the sync modal with date range picker
    if (integration.type === 'toast') {
      // Use the pre-fetched integration ID
      if (toastSyncIntegrationId) {
        setToastSyncLocationName(integration.connectedLocationName)
        setToastSyncModalOpen(true)
      } else {
        toast({
          title: 'Not Connected',
          description: 'Please connect Toast first before syncing.',
          variant: 'destructive',
        })
      }
      return
    }

    // Default behavior for other integrations
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

  const handleToastSyncComplete = () => {
    // Update the Toast integration status
    setIntegrations(
      integrations.map((i) =>
        i.type === 'toast'
          ? { ...i, lastSyncAt: new Date().toISOString() }
          : i
      )
    )
    toast({
      title: 'Sync Complete',
      description: 'Toast data has been synced successfully.',
    })
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
                  onAddConnection={integration.type === 'toast' ? handleAddConnection : undefined}
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

      {/* Toast Connect Modal */}
      <ToastConnectModal
        open={toastModalOpen}
        onOpenChange={setToastModalOpen}
        onSuccess={handleToastConnectSuccess}
      />

      {/* Toast Sync Modal */}
      {toastSyncIntegrationId && (
        <ToastSyncModal
          open={toastSyncModalOpen}
          onOpenChange={setToastSyncModalOpen}
          integrationId={toastSyncIntegrationId}
          locationName={toastSyncLocationName}
          onSyncComplete={handleToastSyncComplete}
        />
      )}
    </div>
  )
}
