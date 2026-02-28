'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Loader2,
  ChevronRight,
  Sparkles,
  TrendingUp,
  DollarSign,
  BarChart3,
  Lock,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useLocation } from '@/hooks/use-location'
import { useToast } from '@/hooks/use-toast'
import { ToastConnectModal } from '@/components/settings/toast-connect-modal'
import { cn } from '@/lib/utils'

// Onboarding steps
type OnboardingStep =
  | 'loading'
  | 'welcome'
  | 'connect-pos'
  | 'syncing-pos'
  | 'select-restaurant-type'
  | 'reveal-pos-insights'
  | 'teaser-accounting'
  | 'connect-accounting'
  | 'syncing-accounting'
  | 'reveal-combined-insights'
  | 'complete'

// Restaurant type options
type RestaurantType =
  | 'fine_dining'
  | 'casual_dining'
  | 'fast_casual'
  | 'quick_service'
  | 'cafe'
  | 'bar_pub'
  | 'bistro'
  | 'ethnic_specialty'
  | 'food_truck'
  | 'buffet'
  | 'family_style'
  | 'ghost_kitchen'

interface RestaurantTypeOption {
  value: RestaurantType
  label: string
  emoji: string
  qualifier: string
}

const RESTAURANT_TYPES: RestaurantTypeOption[] = [
  { value: 'fine_dining', label: 'Fine Dining', emoji: '🍽️', qualifier: '$100+ check · white tablecloth' },
  { value: 'casual_dining', label: 'Casual Dining', emoji: '🍔', qualifier: '$40-80 check · full service' },
  { value: 'fast_casual', label: 'Fast Casual', emoji: '🥗', qualifier: '$12-25 check · counter order' },
  { value: 'quick_service', label: 'Quick Service', emoji: '⚡', qualifier: '$8-15 check · drive-thru' },
  { value: 'cafe', label: 'Café', emoji: '☕', qualifier: 'Coffee & light fare' },
  { value: 'bar_pub', label: 'Bar / Pub', emoji: '🍺', qualifier: 'Drinks primary · food secondary' },
  { value: 'bistro', label: 'Bistro', emoji: '🥘', qualifier: '$50-100 check · neighborhood feel' },
  { value: 'ethnic_specialty', label: 'Ethnic / Specialty', emoji: '🍲', qualifier: 'Cuisine-specific concept' },
  { value: 'food_truck', label: 'Food Truck', emoji: '🚚', qualifier: 'Mobile or pop-up' },
  { value: 'buffet', label: 'Buffet', emoji: '🍱', qualifier: 'Self-serve · fixed price' },
  { value: 'family_style', label: 'Family-Style', emoji: '👨‍👩‍👧‍👦', qualifier: 'Kids menu · high turnover' },
  { value: 'ghost_kitchen', label: 'Ghost Kitchen / Virtual', emoji: '👻', qualifier: 'Delivery only · no dine-in' },
]

interface MonthStatus {
  label: string
  startDate: Date
  endDate: Date
  status: 'not_synced' | 'synced' | 'syncing' | 'error' | 'queued'
  ordersLoaded?: number
  netSales?: number
  orderCount?: number
}

interface Intelligence {
  title: string
  summary: string
  insights: string[]
  recommendations: string[]
  dataQuality: 'excellent' | 'good' | 'limited'
}

interface SyncProgress {
  phase: 'connecting' | 'fetching' | 'processing' | 'saving' | 'complete' | 'error'
  message: string
  ordersProcessed: number
  totalDays: number
  currentDay: number
  percentComplete: number
  fetchingPage?: number
  ordersLoaded?: number
  summary?: {
    netSales: number
    orderCount: number
  }
  error?: string
}

interface PreCompletedData {
  posConnected: boolean
  posName: string
  restaurantName: string
  syncedMonths: number
  totalRevenue: number
  daysWithData: number
  restaurantType?: RestaurantType
}

// Helper to get restaurant type label
function getRestaurantTypeLabel(type: RestaurantType): string {
  const found = RESTAURANT_TYPES.find(t => t.value === type)
  return found ? `${found.emoji} ${found.label}` : type
}

// Get 7 months with current month first
function get7Months(): { label: string; startDate: Date; endDate: Date }[] {
  const months: { label: string; startDate: Date; endDate: Date }[] = []
  const now = new Date()

  for (let i = 0; i < 7; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    const effectiveEnd = i === 0 ? now : end
    const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    months.push({ label, startDate: start, endDate: effectiveEnd })
  }

  return months
}

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentLocation, locations } = useLocation()

  // State
  const [step, setStep] = useState<OnboardingStep>('loading')
  const [locationId, setLocationId] = useState<string | null>(null)
  const [integrationId, setIntegrationId] = useState<string | null>(null)
  const [toastModalOpen, setToastModalOpen] = useState(false)
  const [months, setMonths] = useState<MonthStatus[]>([])
  const [currentMonthIndex, setCurrentMonthIndex] = useState(-1)
  const [posIntelligence, setPosIntelligence] = useState<Intelligence | null>(null)
  const [combinedIntelligence, setCombinedIntelligence] = useState<Intelligence | null>(null)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [totalSynced, setTotalSynced] = useState({ sales: 0, orders: 0 })
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [preCompletedData, setPreCompletedData] = useState<PreCompletedData | null>(null)
  const [selectedRestaurantType, setSelectedRestaurantType] = useState<RestaurantType | null>(null)
  const [isSavingRestaurantType, setIsSavingRestaurantType] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const locationToUse = currentLocation ?? locations[0]

  // Check onboarding status on mount
  // Pass the selected location from localStorage (set by location dropdown)
  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        // Get selected location from localStorage (matches dropdown selection)
        const selectedLocationId = localStorage.getItem('selectedLocationId')
        const url = selectedLocationId
          ? `/api/onboarding/status?locationId=${selectedLocationId}`
          : '/api/onboarding/status'
        const response = await fetch(url)
        const data = await response.json()

        console.log('[Onboarding] Status response:', data)

        if (!data.needsOnboarding) {
          // Fully complete - redirect to dashboard
          router.replace('/dashboard')
          return
        }

        // Set location ID and integration ID if available
        if (data.locationId) {
          setLocationId(data.locationId)
        }
        if (data.integrationId) {
          setIntegrationId(data.integrationId)
        }

        // Set completed steps
        if (data.completedSteps) {
          setCompletedSteps(data.completedSteps)
        }

        // Set pre-completed data for display
        if (data.posConnected) {
          setPreCompletedData({
            posConnected: data.posConnected,
            posName: data.posName ?? 'Toast',
            restaurantName: data.restaurantName ?? 'Your Restaurant',
            syncedMonths: data.syncedMonths ?? 0,
            totalRevenue: data.totalRevenue ?? 0,
            daysWithData: data.daysWithData ?? 0,
            restaurantType: data.restaurantType ?? undefined,
          })
          setTotalSynced({
            sales: data.totalRevenue ?? 0,
            orders: data.daysWithData ?? 0,
          })
          // Set selected restaurant type if already chosen
          if (data.restaurantType) {
            setSelectedRestaurantType(data.restaurantType as RestaurantType)
          }
        }

        // Set current step based on API response
        if (data.currentStep) {
          console.log('[Onboarding] Setting step to:', data.currentStep)
          setStep(data.currentStep as OnboardingStep)
        } else if (data.reason === 'no_pos_integration' || data.reason === 'pos_not_connected') {
          setStep('welcome')
        } else {
          setStep('welcome')
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
        setStep('welcome')
      }
    }

    // Run immediately on mount - API gets location from server-side auth
    checkOnboardingStatus()
  }, [router])

  // Handle POS connection success
  const handlePosConnectSuccess = (newIntegrationId: string) => {
    setIntegrationId(newIntegrationId)
    setToastModalOpen(false)
    setStep('syncing-pos')

    // Initialize months for syncing
    const monthsToSync = get7Months()
    setMonths(monthsToSync.map(m => ({
      ...m,
      status: 'queued' as const
    })))

    // Start syncing
    setTimeout(() => runPosSync(newIntegrationId), 500)
  }

  // Parse SSE events
  const parseSSEEvents = (text: string): SyncProgress[] => {
    const events: SyncProgress[] = []
    const lines = text.split('\n\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          events.push(JSON.parse(line.slice(6)))
        } catch {
          // Ignore parse errors
        }
      }
    }
    return events
  }

  // Sync a single month
  const syncMonth = useCallback(async (
    intId: string,
    month: { label: string; startDate: Date; endDate: Date }
  ): Promise<{ success: boolean; netSales: number; orderCount: number }> => {
    setMonths(prev => prev.map(m =>
      m.label === month.label ? { ...m, status: 'syncing' as const } : m
    ))

    try {
      const params = new URLSearchParams({
        integrationId: intId,
        startDate: month.startDate.toISOString(),
        endDate: month.endDate.toISOString(),
      })

      abortControllerRef.current = new AbortController()

      const response = await fetch(`/api/integrations/toast/sync/stream?${params}`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let result = { netSales: 0, orderCount: 0 }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = parseSSEEvents(buffer)
        buffer = ''

        for (const event of events) {
          if (event.phase === 'fetching') {
            setMonths(prev => prev.map(m =>
              m.label === month.label ? { ...m, ordersLoaded: event.ordersLoaded } : m
            ))
          } else if (event.phase === 'complete' && event.summary) {
            result = { netSales: event.summary.netSales, orderCount: event.summary.orderCount }
            setMonths(prev => prev.map(m =>
              m.label === month.label
                ? { ...m, status: 'synced' as const, netSales: result.netSales, orderCount: result.orderCount }
                : m
            ))
            return { success: true, ...result }
          } else if (event.phase === 'error') {
            throw new Error(event.error || 'Sync failed')
          }
        }
      }

      return { success: true, ...result }
    } catch (error) {
      setMonths(prev => prev.map(m =>
        m.label === month.label ? { ...m, status: 'error' as const } : m
      ))
      console.error(`Failed to sync ${month.label}:`, error)
      return { success: false, netSales: 0, orderCount: 0 }
    }
  }, [])

  // Run POS sync
  const runPosSync = useCallback(async (intId: string) => {
    const monthsToSync = get7Months()
    let totalSales = 0
    let totalOrders = 0

    for (let i = 0; i < monthsToSync.length; i++) {
      const month = monthsToSync[i]
      setCurrentMonthIndex(i)

      const result = await syncMonth(intId, month)
      totalSales += result.netSales
      totalOrders += result.orderCount

      setTotalSynced({ sales: totalSales, orders: totalOrders })

      // Update onboarding progress in database
      await fetch('/api/integrations/toast/onboarding-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: intId,
          syncedMonths: i + 1,
          step: 2,
        }),
      }).catch(() => {}) // Non-critical

      // Small delay between months
      if (i < monthsToSync.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    setCurrentMonthIndex(-1)

    // Go to restaurant type selection before insights
    setStep('select-restaurant-type')
  }, [syncMonth])

  // Generate POS insights
  const generatePosInsights = useCallback(async () => {
    // Use locationId from API response, fallback to hook
    const locId = locationId ?? locationToUse?.id
    if (!locId) {
      console.error('[Onboarding] No locationId available for insights generation')
      return
    }

    setIsGeneratingInsights(true)

    try {
      const response = await fetch('/api/intelligence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: locId,
          dataType: 'pos',
        }),
      })

      const data = await response.json()

      if (data.success && data.intelligence) {
        setPosIntelligence(data.intelligence)
      } else {
        throw new Error(data.error || 'Failed to generate insights')
      }
    } catch (error) {
      console.error('Failed to generate insights:', error)
      // Set fallback insight
      setPosIntelligence({
        title: 'Sales Analysis Complete',
        summary: `We've analyzed your sales data. Connect your accounting system to unlock deeper insights.`,
        insights: ['Your sales data has been synced and analyzed.'],
        recommendations: ['Connect accounting data for cost analysis and profit insights.'],
        dataQuality: 'good',
      })
    } finally {
      setIsGeneratingInsights(false)
    }
  }, [locationId, locationToUse?.id])

  // Save restaurant type and proceed to insights
  const saveRestaurantTypeAndContinue = async () => {
    if (!selectedRestaurantType) {
      toast({
        title: 'Please select a restaurant type',
        description: 'This helps us tailor insights to your concept.',
        variant: 'destructive',
      })
      return
    }

    const locId = locationId ?? locationToUse?.id
    if (!locId) {
      console.error('[Onboarding] No locationId available')
      return
    }

    setIsSavingRestaurantType(true)

    try {
      const response = await fetch(`/api/locations/${locId}/restaurant-type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantType: selectedRestaurantType }),
      })

      if (!response.ok) {
        throw new Error('Failed to save restaurant type')
      }

      // Add to completed steps
      setCompletedSteps(prev => [...prev, 'select-restaurant-type'])

      // Update preCompletedData with the restaurant type
      setPreCompletedData(prev => prev ? { ...prev, restaurantType: selectedRestaurantType } : null)

      // Proceed to insights
      setStep('reveal-pos-insights')
      await generatePosInsights()
    } catch (error) {
      console.error('Failed to save restaurant type:', error)
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingRestaurantType(false)
    }
  }

  // Mark onboarding as complete
  const markOnboardingComplete = async () => {
    if (integrationId) {
      await fetch('/api/integrations/toast/onboarding-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId,
          syncedMonths: preCompletedData?.syncedMonths ?? 7,
          step: 6, // Final step
        }),
      }).catch(() => {})
    }
    setStep('complete')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const syncedCount = months.filter(m => m.status === 'synced').length
  const progress = (syncedCount / 7) * 100

  // Check if steps are pre-completed
  const isPosConnectComplete = completedSteps.includes('connect-pos')
  const isSyncComplete = completedSteps.includes('syncing-pos')

  // Loading state
  if (step === 'loading') {
    return (
      <div className="container max-w-3xl py-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-3xl py-8 space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {['connect-pos', 'syncing-pos', 'select-restaurant-type', 'reveal-pos-insights', 'teaser-accounting'].map((s, i) => (
          <div
            key={s}
            className={cn(
              'h-2 w-12 rounded-full transition-colors',
              completedSteps.includes(s) || step === s || (['welcome', 'connect-pos'].includes(step) && i === 0)
                ? 'bg-primary'
                : i < ['connect-pos', 'syncing-pos', 'select-restaurant-type', 'reveal-pos-insights', 'teaser-accounting'].indexOf(step)
                  ? 'bg-primary'
                  : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Pre-completed steps summary (shown when on restaurant type or insights step) */}
      {(isPosConnectComplete || isSyncComplete) && (step === 'select-restaurant-type' || step === 'reveal-pos-insights') && preCompletedData && (
        <div className="space-y-3">
          {/* Connect POS - Completed */}
          <Card className="border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/10">
            <CardContent className="flex items-center gap-4 p-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-700 dark:text-green-400">Connect your POS</p>
                <p className="text-sm text-green-600/80 dark:text-green-400/70">
                  {preCompletedData.posName} connected · {preCompletedData.restaurantName}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sync Data - Completed */}
          <Card className="border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/10">
            <CardContent className="flex items-center gap-4 p-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-700 dark:text-green-400">Sync sales data</p>
                <p className="text-sm text-green-600/80 dark:text-green-400/70">
                  {preCompletedData.syncedMonths} months synced · {formatCurrency(preCompletedData.totalRevenue)} total revenue
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Restaurant Type - Completed (only show on insights step) */}
          {completedSteps.includes('select-restaurant-type') && preCompletedData.restaurantType && step === 'reveal-pos-insights' && (
            <Card className="border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/10">
              <CardContent className="flex items-center gap-4 p-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-green-700 dark:text-green-400">Tell us about your restaurant</p>
                  <p className="text-sm text-green-600/80 dark:text-green-400/70">
                    {getRestaurantTypeLabel(preCompletedData.restaurantType)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-4">
              <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Welcome to Prometheus</h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                Let&apos;s connect your data sources to unlock AI-powered intelligence for your restaurant.
              </p>
            </div>

            <Card className="text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  What happens next
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</div>
                  <div>
                    <p className="font-medium">Connect your POS</p>
                    <p className="text-sm text-muted-foreground">We&apos;ll sync 7 months of sales data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</div>
                  <div>
                    <p className="font-medium">Reveal your first insights</p>
                    <p className="text-sm text-muted-foreground">AI analyzes your sales patterns</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">3</div>
                  <div>
                    <p className="font-medium text-muted-foreground">Connect accounting (optional)</p>
                    <p className="text-sm text-muted-foreground">Unlock profit analysis and cost insights</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button size="lg" onClick={() => setStep('connect-pos')}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* Connect POS Step */}
        {step === 'connect-pos' && (
          <motion.div
            key="connect-pos"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Connect Your POS</h1>
              <p className="text-muted-foreground">
                Start with your point-of-sale to unlock sales intelligence
              </p>
            </div>

            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setToastModalOpen(true)}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <img src="/integrations/toast.svg" alt="Toast" className="h-12 w-12" />
                <div className="flex-1">
                  <h3 className="font-semibold">Toast POS</h3>
                  <p className="text-sm text-muted-foreground">Connect your Toast account</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="opacity-60">
              <CardContent className="flex items-center gap-4 p-6">
                <img src="/integrations/square.svg" alt="Square" className="h-12 w-12" />
                <div className="flex-1">
                  <h3 className="font-semibold">Square</h3>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Syncing POS Step */}
        {step === 'syncing-pos' && (
          <motion.div
            key="syncing-pos"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Syncing Your Data</h1>
              <p className="text-muted-foreground">
                Importing 7 months of sales history...
              </p>
            </div>

            <Card>
              <CardContent className="py-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{syncedCount} of 7 months</span>
                    <span className="tabular-nums">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-2xl font-bold tabular-nums">
                      {totalSynced.orders.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Orders Synced</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-2xl font-bold tabular-nums">
                      {formatCurrency(totalSynced.sales)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {months.map((month) => (
                    <div
                      key={month.label}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                        month.status === 'syncing' && 'bg-blue-50 dark:bg-blue-950/20',
                        month.status === 'synced' && 'bg-green-50/50 dark:bg-green-950/10'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {month.status === 'synced' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {month.status === 'syncing' && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        )}
                        {month.status === 'queued' && (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <span className={month.status === 'syncing' ? 'font-medium' : ''}>
                          {month.label}
                        </span>
                      </div>
                      <span className="text-muted-foreground tabular-nums">
                        {month.status === 'synced' && month.netSales
                          ? formatCurrency(month.netSales)
                          : month.status === 'syncing' && month.ordersLoaded
                            ? `${month.ordersLoaded.toLocaleString()} orders...`
                            : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground">
              This usually takes 2-3 minutes. You can leave this page and we&apos;ll continue in the background.
            </p>
          </motion.div>
        )}

        {/* Select Restaurant Type Step */}
        {step === 'select-restaurant-type' && (
          <motion.div
            key="select-restaurant-type"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">
                What type of restaurant is{' '}
                {preCompletedData?.restaurantName ?? locationToUse?.name ?? 'your restaurant'}?
              </h1>
              <p className="text-muted-foreground">
                This helps us tailor insights, benchmarks, and recommendations to your concept.
              </p>
              <p className="text-xs text-muted-foreground">
                Not sure? Pick based on your average check size and service style.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {RESTAURANT_TYPES.map((type) => (
                <Card
                  key={type.value}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedRestaurantType === type.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedRestaurantType(type.value)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-2xl mb-1">{type.emoji}</span>
                    <span className={cn(
                      'text-sm font-medium',
                      selectedRestaurantType === type.value && 'text-primary'
                    )}>
                      {type.label}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {type.qualifier}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={saveRestaurantTypeAndContinue}
              disabled={!selectedRestaurantType || isSavingRestaurantType}
            >
              {isSavingRestaurantType ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Reveal POS Insights Step */}
        {step === 'reveal-pos-insights' && (
          <motion.div
            key="reveal-pos-insights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Current step indicator */}
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Reveal your first insights</p>
                  <p className="text-sm text-muted-foreground">
                    {posIntelligence ? 'AI analysis complete' : 'Click below to generate AI insights'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {!posIntelligence && !isGeneratingInsights && (
              <div className="text-center space-y-4">
                <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Ready for Your Insights</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We&apos;ve synced your sales data. Click below to generate AI-powered insights about your restaurant.
                </p>
                <Button size="lg" onClick={generatePosInsights}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Insights
                </Button>
              </div>
            )}

            {isGeneratingInsights && (
              <Card>
                <CardContent className="py-12 flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Analyzing your data with AI...</p>
                </CardContent>
              </Card>
            )}

            {posIntelligence && !isGeneratingInsights && (
              <>
                <div className="text-center space-y-2">
                  <div className="mx-auto w-fit rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                    <Sparkles className="h-8 w-8 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold">Your First Insights</h1>
                  <p className="text-muted-foreground">
                    Here&apos;s what we discovered from your sales data
                  </p>
                </div>

                <Card className="border-green-200 dark:border-green-900">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      {posIntelligence.title}
                    </CardTitle>
                    <CardDescription>{posIntelligence.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Key Insights</h4>
                      <ul className="space-y-2">
                        {posIntelligence.insights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {posIntelligence.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
                        <ul className="space-y-2">
                          {posIntelligence.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button size="lg" className="w-full" onClick={() => setStep('teaser-accounting')}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </motion.div>
        )}

        {/* Teaser Accounting Step */}
        {step === 'teaser-accounting' && (
          <motion.div
            key="teaser-accounting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Unlock Deeper Insights</h1>
              <p className="text-muted-foreground">
                Connect your accounting system to reveal profit analysis
              </p>
            </div>

            {/* Mystery card showing locked insights */}
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="py-8 space-y-4">
                <div className="flex items-center justify-center gap-4 opacity-50">
                  <div className="rounded-lg bg-muted p-4">
                    <DollarSign className="h-8 w-8" />
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-muted-foreground">Premium Intelligence Locked</p>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Prime cost analysis & benchmarks</li>
                    <li>Labor efficiency by daypart</li>
                    <li>Food cost variance tracking</li>
                    <li>Profit optimization recommendations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "R365 integration will be available during your onboarding session.",
                })
              }}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <img src="/integrations/r365.svg" alt="R365" className="h-12 w-12" />
                <div className="flex-1">
                  <h3 className="font-semibold">Restaurant365</h3>
                  <p className="text-sm text-muted-foreground">Connect to unlock cost insights</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={markOnboardingComplete}
              >
                Skip for Now
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "We'll help you connect R365 during your onboarding session.",
                  })
                  markOnboardingComplete()
                }}
              >
                Connect Accounting
              </Button>
            </div>
          </motion.div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-4">
              <div className="mx-auto w-fit rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold">You&apos;re All Set!</h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                Your dashboard is ready. We&apos;ll continue syncing data automatically in the background.
              </p>
            </div>

            <Card>
              <CardContent className="py-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-green-600">
                      {preCompletedData?.syncedMonths ?? syncedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Months Synced</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-green-600">
                      {formatCurrency(totalSynced.sales || preCompletedData?.totalRevenue || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Sales Analyzed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button size="lg" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Connect Modal */}
      <ToastConnectModal
        open={toastModalOpen}
        onOpenChange={setToastModalOpen}
        onSuccess={handlePosConnectSuccess}
      />
    </div>
  )
}
