'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useLocation } from '@/hooks/use-location'

interface ToastConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (integrationId: string, locationName: string) => void
}

export function ToastConnectModal({
  open,
  onOpenChange,
  onSuccess,
}: ToastConnectModalProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { locations } = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'credentials' | 'connected'>('credentials')
  const [result, setResult] = useState<{
    integrationId: string
    restaurant: {
      name: string
      address: string
      city: string
    }
  } | null>(null)

  // Form state
  const [clientId, setClientId] = useState(
    process.env.NEXT_PUBLIC_TOAST_CLIENT_ID || ''
  )
  const [clientSecret, setClientSecret] = useState('')
  const [restaurantGuid, setRestaurantGuid] = useState('')
  const [locationId, setLocationId] = useState('')

  const handleConnect = async () => {
    if (!clientId || !clientSecret || !restaurantGuid || !locationId) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/integrations/toast/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientSecret,
          restaurantGuid,
          locationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect')
      }

      setResult({
        integrationId: data.integrationId,
        restaurant: data.restaurant,
      })
      setStep('connected')

      const connectedLocation = locations.find((loc) => loc.id === locationId)
      toast({
        title: 'Connected!',
        description: `Successfully connected to ${data.restaurant.name}`,
      })

      onSuccess?.(data.integrationId, connectedLocation?.name ?? '')
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Toast',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartBackfill = () => {
    if (result?.integrationId) {
      // Close modal and redirect to sync status page
      onOpenChange(false)
      router.push(`/dashboard/integrations/toast/sync-status?integrationId=${result.integrationId}&autoStart=true`)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form after close animation
    setTimeout(() => {
      setStep('credentials')
      setResult(null)
      setClientSecret('')
      setRestaurantGuid('')
      setLocationId('')
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'credentials' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <img
                  src="/integrations/toast.svg"
                  alt="Toast"
                  className="h-6 w-6"
                />
                Connect Toast POS
              </DialogTitle>
              <DialogDescription>
                Enter your Toast API credentials to connect. You can find these in the
                Toast Partner Portal.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Your Toast Client ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Your Toast Client Secret"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurantGuid">Restaurant GUID</Label>
                <Input
                  id="restaurantGuid"
                  value={restaurantGuid}
                  onChange={(e) => setRestaurantGuid(e.target.value)}
                  placeholder="e.g., 7d5f8162-aeda-436a-85d0-7191e37b96c3"
                />
                <p className="text-xs text-muted-foreground">
                  Found in your Toast restaurant settings
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Prometheus Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location to connect" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'connected' && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Connected Successfully
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Toast Restaurant
                </p>
                <p className="font-medium">{result.restaurant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {result.restaurant.address}, {result.restaurant.city}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Prometheus Location
                </p>
                <p className="font-medium">
                  {locations.find((loc) => loc.id === locationId)?.name ?? 'Unknown'}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-900">
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                  Ready to sync 12 months of historical data
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400/80 mt-1">
                  This will import all your sales data from the past year
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Skip for now
              </Button>
              <Button onClick={handleStartBackfill}>
                Start 12-Month Sync
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
