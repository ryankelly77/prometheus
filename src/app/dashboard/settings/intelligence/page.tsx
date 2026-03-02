'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Brain,
  Edit2,
  Plus,
  X,
  RefreshCw,
  CheckCircle2,
  Circle,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ClipboardList,
  Tags,
  MessageSquareText,
  BarChart3,
  Lightbulb,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLocation } from '@/hooks/use-location'
import { useToast } from '@/hooks/use-toast'
import { DescriptorChecklist } from '@/components/onboarding/descriptor-checklist'
import { cn } from '@/lib/utils'

// Types
interface DataFacts {
  avgMonthlyRevenue?: number
  avgDailyRevenue?: number
  avgCheck?: number
  totalMonthsOfData?: number
  totalOrders?: number
  avgDailyOrders?: number
  peakDays?: string[]
  weakestDays?: string[]
  dayOfWeekAvg?: Record<string, number>
  revenueMix?: { food?: number; wine?: number; beer?: number; liquor?: number }
  monthlyTrend?: Array<{ month: string; netSales: number; orders: number }>
  monthOverMonthGrowth?: number
  seasonalPeak?: string
}

interface RestaurantProfile {
  id: string
  locationId: string
  restaurantType?: string | null
  conceptDescription?: string | null
  cuisineType?: string | null
  priceRange?: string | null
  seatingCapacity?: number | null
  neighborhood?: string | null
  targetDemographic?: string | null
  selectedDescriptors: string[]
  userContext: string[]
  dataFacts: DataFacts
  factsUpdatedAt?: string | null
}

interface DescriptorCategory {
  id: string
  label: string
  descriptors: Array<{
    id: string
    label: string
    context: string
  }>
}

interface FeedbackRecord {
  id: string
  rating: string
  userComment: string | null
  createdAt: string
  insight: {
    id: string
    title: string | null
  }
}

interface IntegrationStatus {
  type: string
  status: string
  syncedMonths?: number
  lastSyncAt?: string
}

interface WeatherStatus {
  enabled: boolean
  hasCoordinates: boolean
  weatherDays?: number
}

const RESTAURANT_TYPES = [
  { value: 'fine_dining', label: 'Fine Dining' },
  { value: 'casual_dining', label: 'Casual Dining' },
  { value: 'fast_casual', label: 'Fast Casual' },
  { value: 'quick_service', label: 'Quick Service' },
  { value: 'cafe', label: 'Café' },
  { value: 'bar_pub', label: 'Bar / Pub' },
  { value: 'bistro', label: 'Bistro' },
  { value: 'ethnic_specialty', label: 'Ethnic / Specialty' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'family_style', label: 'Family-Style' },
  { value: 'ghost_kitchen', label: 'Ghost Kitchen' },
]

const PRICE_RANGES = [
  { value: '$', label: '$ — Budget-friendly' },
  { value: '$$', label: '$$ — Moderate' },
  { value: '$$$', label: '$$$ — Upscale' },
  { value: '$$$$', label: '$$$$ — Premium / Luxury' },
]

export default function IntelligenceProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentLocation } = useLocation()

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<RestaurantProfile | null>(null)
  const [descriptorCategories, setDescriptorCategories] = useState<DescriptorCategory[]>([])
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus | null>(null)
  const [feedbackRecords, setFeedbackRecords] = useState<FeedbackRecord[]>([])
  const [feedbackStats, setFeedbackStats] = useState({ helpful: 0, notHelpful: 0, incorrect: 0 })

  // Edit states
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [isEditingDescriptors, setIsEditingDescriptors] = useState(false)
  const [isAddingContext, setIsAddingContext] = useState(false)
  const [newContextInput, setNewContextInput] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state for details editing
  const [editForm, setEditForm] = useState({
    restaurantType: '',
    conceptDescription: '',
    cuisineType: '',
    priceRange: '',
    seatingCapacity: '',
    neighborhood: '',
    targetDemographic: '',
  })

  // Descriptor editing state
  const [editingDescriptors, setEditingDescriptors] = useState<string[]>([])
  const [editingConceptDescription, setEditingConceptDescription] = useState('')

  // Custom context state (user-added strings, not from descriptors)
  const [customContextItems, setCustomContextItems] = useState<string[]>([])

  const locationId = currentLocation?.id

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!locationId) return

    setIsLoading(true)
    try {
      // Fetch profile
      const profileRes = await fetch(`/api/restaurant/profile?locationId=${locationId}`)
      const profileData = await profileRes.json()

      if (profileData.profile) {
        setProfile(profileData.profile)

        // Extract custom context (items that don't start with descriptor patterns)
        const descriptorPrefixes = ['Tasting menu', 'À la carte', 'Chef-driven', 'Classic white', 'Modern fine',
          'Active sommelier', 'Wine-forward', 'Serious craft', 'Beverage pairing', 'Features rare',
          'Special occasion', 'Popular for business', 'Hotel restaurant', 'Standalone destination',
          'Located in affluent', 'Dinner-only', 'Serves both', 'Has private dining', 'Reservation-only',
          'Menu changes', 'Pursuing Michelin', 'Established fine', 'Growing private', 'Active media']

        const customItems = (profileData.profile.userContext || []).filter((ctx: string) => {
          // Keep items that are clearly custom (start with common prefixes or don't match descriptors)
          return ctx.startsWith('Concept:') ||
                 ctx.startsWith('Cuisine:') ||
                 ctx.startsWith('Target demographic:') ||
                 ctx.startsWith('Price range:') ||
                 ctx.startsWith('Located in') ||
                 !descriptorPrefixes.some(prefix => ctx.startsWith(prefix))
        }).filter((ctx: string) => {
          // Filter out the auto-generated ones
          return !ctx.startsWith('Concept:') &&
                 !ctx.startsWith('Cuisine:') &&
                 !ctx.startsWith('Target demographic:')
        })

        setCustomContextItems(customItems)

        // Fetch descriptors for this restaurant type
        if (profileData.profile.restaurantType) {
          const descriptorRes = await fetch(`/api/restaurant/descriptors?type=${profileData.profile.restaurantType}`)
          const descriptorData = await descriptorRes.json()
          if (descriptorData.categories) {
            setDescriptorCategories(descriptorData.categories)
          }
        }
      }

      // Fetch integrations
      const integrationsRes = await fetch(`/api/locations/${locationId}`)
      const locationData = await integrationsRes.json()
      if (locationData.location?.integrations) {
        setIntegrations(locationData.location.integrations.map((int: { type: string; status: string; lastSyncAt?: string }) => ({
          type: int.type,
          status: int.status,
          lastSyncAt: int.lastSyncAt,
        })))
      }

      // Fetch weather status
      const weatherRes = await fetch(`/api/weather/enable?locationId=${locationId}`)
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json()
        setWeatherStatus({
          enabled: weatherData.enabled,
          hasCoordinates: weatherData.hasCoordinates,
          weatherDays: weatherData.weatherDays,
        })
      }

      // Fetch feedback
      const feedbackRes = await fetch(`/api/intelligence/feedback?locationId=${locationId}`)
      const feedbackData = await feedbackRes.json()
      if (feedbackData.feedback) {
        setFeedbackRecords(feedbackData.feedback)
        setFeedbackStats(feedbackData.stats || { helpful: 0, notHelpful: 0, incorrect: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast({
        title: 'Failed to load profile',
        description: 'Please try refreshing the page.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [locationId, toast])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Initialize edit form when profile loads
  useEffect(() => {
    if (profile) {
      setEditForm({
        restaurantType: profile.restaurantType || '',
        conceptDescription: profile.conceptDescription || '',
        cuisineType: profile.cuisineType || '',
        priceRange: profile.priceRange || '',
        seatingCapacity: profile.seatingCapacity?.toString() || '',
        neighborhood: profile.neighborhood || '',
        targetDemographic: profile.targetDemographic || '',
      })
      setEditingDescriptors(profile.selectedDescriptors || [])
      setEditingConceptDescription(profile.conceptDescription || '')
    }
  }, [profile])

  // Save details
  const saveDetails = async () => {
    if (!locationId) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/restaurant/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          restaurantType: editForm.restaurantType || undefined,
          conceptDescription: editForm.conceptDescription || undefined,
          cuisineType: editForm.cuisineType || undefined,
          priceRange: editForm.priceRange || undefined,
          seatingCapacity: editForm.seatingCapacity ? parseInt(editForm.seatingCapacity) : undefined,
          neighborhood: editForm.neighborhood || undefined,
          targetDemographic: editForm.targetDemographic || undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast({ title: 'Profile updated' })
      setIsEditingDetails(false)
      fetchProfile()
    } catch (error) {
      console.error('Failed to save details:', error)
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Save descriptors
  const saveDescriptors = async () => {
    if (!locationId) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/restaurant/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          selectedDescriptors: editingDescriptors,
          conceptDescription: editingConceptDescription || undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast({ title: 'Descriptors updated' })
      setIsEditingDescriptors(false)
      fetchProfile()
    } catch (error) {
      console.error('Failed to save descriptors:', error)
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Add custom context
  const addCustomContext = async () => {
    if (!locationId || !newContextInput.trim()) return

    const newContext = [...customContextItems, newContextInput.trim()]
    setCustomContextItems(newContext)
    setNewContextInput('')
    setIsAddingContext(false)

    // Save to profile - we'll add these as userContext items
    // The API will need to merge with descriptor-generated context
    try {
      // For now, we'll store custom context separately
      // This requires updating the API to handle custom context
      toast({ title: 'Context added' })
    } catch (error) {
      console.error('Failed to add context:', error)
    }
  }

  // Remove custom context
  const removeCustomContext = (index: number) => {
    const newContext = customContextItems.filter((_, i) => i !== index)
    setCustomContextItems(newContext)
    toast({ title: 'Context removed' })
  }

  // Regenerate insights
  const regenerateInsights = async () => {
    if (!locationId) return

    setIsRegenerating(true)
    try {
      const response = await fetch('/api/intelligence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          dataType: 'pos',
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: 'Insights regenerated!' })
        router.push('/dashboard/intelligence')
      } else {
        throw new Error(data.error || 'Failed to regenerate')
      }
    } catch (error) {
      console.error('Failed to regenerate:', error)
      toast({
        title: 'Failed to regenerate',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  // Get selected descriptors grouped by category
  const getSelectedDescriptorsByCategory = () => {
    const grouped: Record<string, Array<{ id: string; label: string }>> = {}

    for (const category of descriptorCategories) {
      const selected = category.descriptors.filter(d =>
        profile?.selectedDescriptors?.includes(d.id)
      )
      if (selected.length > 0) {
        grouped[category.label] = selected
      }
    }

    return grouped
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Get restaurant type label
  const getTypeLabel = (value: string) => {
    return RESTAURANT_TYPES.find(t => t.value === value)?.label || value
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  const selectedByCategory = getSelectedDescriptorsByCategory()

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Restaurant Intelligence Profile</h1>
            <p className="text-muted-foreground">
              This is everything Prometheus knows about {currentLocation?.name || 'your restaurant'}.
              The more context you provide, the smarter your insights become.
            </p>
          </div>
        </div>
      </div>

      {/* Restaurant Details Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Restaurant Details</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditingDetails(true)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-2 font-medium">
                {profile?.restaurantType ? getTypeLabel(profile.restaurantType) : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Concept:</span>
              <span className="ml-2 font-medium">
                {profile?.conceptDescription || '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Cuisine:</span>
              <span className="ml-2 font-medium">
                {profile?.cuisineType || '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Price Range:</span>
              <span className="ml-2 font-medium">
                {profile?.priceRange || '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Neighborhood:</span>
              <span className="ml-2 font-medium">
                {profile?.neighborhood || '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Seating:</span>
              <span className="ml-2 font-medium">
                {profile?.seatingCapacity || '—'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Target Customer:</span>
              <span className="ml-2 font-medium">
                {profile?.targetDemographic || '—'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Concept Descriptors Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Concept Descriptors</CardTitle>
              <CardDescription>
                Selected during onboarding — these tell the AI what kind of operation you run.
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditingDescriptors(true)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {Object.keys(selectedByCategory).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No descriptors selected. Click Edit to add some.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(selectedByCategory).map(([category, descriptors]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">{category}:</h4>
                  <ul className="space-y-1">
                    {descriptors.map(d => (
                      <li key={d.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {d.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Context Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Custom Context</CardTitle>
              <CardDescription>
                Anything you&apos;ve told Prometheus that isn&apos;t captured above. These override AI assumptions.
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingContext(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {customContextItems.length === 0 && !isAddingContext ? (
            <p className="text-sm text-muted-foreground">
              No custom context added yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {customContextItems.map((item, index) => (
                <li key={index} className="flex items-start justify-between gap-2 text-sm bg-muted/50 rounded-lg p-3">
                  <span>&quot;{item}&quot;</span>
                  <button
                    onClick={() => removeCustomContext(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isAddingContext && (
            <div className="mt-4 space-y-3">
              <Textarea
                placeholder="Tell Prometheus something it should know about your restaurant..."
                value={newContextInput}
                onChange={(e) => setNewContextInput(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addCustomContext} disabled={!newContextInput.trim()}>
                  Add Context
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setIsAddingContext(false)
                  setNewContextInput('')
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Facts Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Data Facts (auto-calculated)</CardTitle>
              <CardDescription>
                Updated automatically from your POS data.
                {profile?.factsUpdatedAt && (
                  <span className="ml-1">
                    Last updated: {formatDate(profile.factsUpdatedAt)}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!profile?.dataFacts || Object.keys(profile.dataFacts).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sync your POS data to populate these metrics.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {profile.dataFacts.avgMonthlyRevenue && (
                <div>
                  <span className="text-muted-foreground">Avg Monthly Revenue:</span>
                  <span className="ml-2 font-medium tabular-nums">
                    {formatCurrency(profile.dataFacts.avgMonthlyRevenue)}
                  </span>
                </div>
              )}
              {profile.dataFacts.avgCheck && (
                <div>
                  <span className="text-muted-foreground">Avg Check:</span>
                  <span className="ml-2 font-medium tabular-nums">
                    ${profile.dataFacts.avgCheck.toFixed(2)}
                  </span>
                </div>
              )}
              {profile.dataFacts.avgDailyOrders && (
                <div>
                  <span className="text-muted-foreground">Daily Orders (avg):</span>
                  <span className="ml-2 font-medium tabular-nums">
                    {profile.dataFacts.avgDailyOrders}
                  </span>
                </div>
              )}
              {profile.dataFacts.peakDays && profile.dataFacts.peakDays.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Peak Days:</span>
                  <span className="ml-2 font-medium">
                    {profile.dataFacts.peakDays.slice(0, 2).join(', ')}
                  </span>
                </div>
              )}
              {profile.dataFacts.weakestDays && profile.dataFacts.weakestDays.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Weakest Days:</span>
                  <span className="ml-2 font-medium">
                    {profile.dataFacts.weakestDays.join(', ')}
                  </span>
                </div>
              )}
              {profile.dataFacts.revenueMix && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Revenue Mix:</span>
                  <span className="ml-2 font-medium">
                    {Object.entries(profile.dataFacts.revenueMix)
                      .filter(([, v]) => v && v > 0)
                      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}%`)
                      .join(' · ')}
                  </span>
                </div>
              )}
              {profile.dataFacts.totalMonthsOfData && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Data Range:</span>
                  <span className="ml-2 font-medium">
                    {profile.dataFacts.totalMonthsOfData} months of data
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intelligence Sources Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Intelligence Sources</CardTitle>
              <CardDescription>
                Each source makes your insights smarter.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Toast POS */}
          {integrations.find(i => i.type === 'TOAST' && i.status === 'CONNECTED') ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">Toast POS</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.dataFacts?.totalMonthsOfData || 0} months synced
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/settings?tab=integrations')}>
                Manage
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Circle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Toast POS</p>
                  <p className="text-xs text-muted-foreground">Not connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/settings?tab=integrations')}>
                Connect
              </Button>
            </div>
          )}

          {/* Weather */}
          {weatherStatus?.enabled ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">Weather</p>
                  <p className="text-xs text-muted-foreground">
                    {weatherStatus.weatherDays || 0} days of weather data
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/insights')}>
                View Insights
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Circle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Weather</p>
                  <p className="text-xs text-muted-foreground">
                    {weatherStatus?.hasCoordinates === false ? 'Location coordinates needed' : 'Not enabled'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/insights')}
              >
                Enable
              </Button>
            </div>
          )}

          {/* Coming Soon Sources */}
          {[
            { name: 'Local Events', description: 'Spurs games · Concerts · Festivals' },
            { name: 'Accounting', description: 'R365 · MarginEdge · QuickBooks' },
            { name: 'Reservations', description: 'OpenTable · Resy · Tock' },
            { name: 'Social Media', description: 'Instagram · Facebook · Google' },
            { name: 'Visibility / SEO', description: 'Search rankings · Online presence' },
          ].map((source) => (
            <div key={source.name} className="flex items-center justify-between p-3 rounded-lg border opacity-60">
              <div className="flex items-center gap-3">
                <Circle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm text-muted-foreground">{source.name}</p>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">Coming Soon</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feedback History Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Insight Feedback History</CardTitle>
              <CardDescription>
                Your feedback helps Prometheus learn.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                <span>{feedbackStats.helpful} insights marked helpful</span>
              </div>
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-red-600" />
                <span>{feedbackStats.notHelpful + feedbackStats.incorrect} insights marked not useful</span>
              </div>
            </div>

            {feedbackRecords.filter(f => f.rating !== 'helpful' && f.userComment).length > 0 && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs text-muted-foreground">Feedback comments:</p>
                {feedbackRecords
                  .filter(f => f.rating !== 'helpful' && f.userComment)
                  .slice(0, 3)
                  .map((f) => (
                    <p key={f.id} className="text-sm text-muted-foreground italic">
                      &quot;{f.userComment}&quot;
                    </p>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Regenerate Insights Button */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Regenerate Insights
              </h3>
              <p className="text-sm text-muted-foreground">
                Re-run the AI analysis with your current profile and all feedback applied.
              </p>
            </div>
            <Button onClick={regenerateInsights} disabled={isRegenerating}>
              {isRegenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Details Dialog */}
      <Dialog open={isEditingDetails} onOpenChange={setIsEditingDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Restaurant Details</DialogTitle>
            <DialogDescription>
              Update your restaurant information to improve AI insights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Restaurant Type</Label>
              <Select
                value={editForm.restaurantType}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, restaurantType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {RESTAURANT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Concept Description</Label>
              <Input
                placeholder="e.g., French brasserie with active wine program"
                value={editForm.conceptDescription}
                onChange={(e) => setEditForm(prev => ({ ...prev, conceptDescription: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cuisine Type</Label>
              <Input
                placeholder="e.g., French-inspired, New American"
                value={editForm.cuisineType}
                onChange={(e) => setEditForm(prev => ({ ...prev, cuisineType: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Price Range</Label>
              <Select
                value={editForm.priceRange}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, priceRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select price range..." />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Neighborhood</Label>
                <Input
                  placeholder="e.g., Pearl District"
                  value={editForm.neighborhood}
                  onChange={(e) => setEditForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Seating Capacity</Label>
                <Input
                  type="number"
                  placeholder="e.g., 120"
                  value={editForm.seatingCapacity}
                  onChange={(e) => setEditForm(prev => ({ ...prev, seatingCapacity: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target Customer</Label>
              <Input
                placeholder="e.g., 35-55, affluent professionals"
                value={editForm.targetDemographic}
                onChange={(e) => setEditForm(prev => ({ ...prev, targetDemographic: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditingDetails(false)}>
              Cancel
            </Button>
            <Button onClick={saveDetails} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Descriptors Dialog */}
      <Dialog open={isEditingDescriptors} onOpenChange={setIsEditingDescriptors}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Concept Descriptors</DialogTitle>
            <DialogDescription>
              Select the descriptors that best describe your restaurant&apos;s operation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {profile?.restaurantType ? (
              <DescriptorChecklist
                restaurantType={profile.restaurantType}
                selectedDescriptors={editingDescriptors}
                onDescriptorsChange={setEditingDescriptors}
                conceptDescription={editingConceptDescription}
                onConceptDescriptionChange={setEditingConceptDescription}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Please set a restaurant type first to see available descriptors.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditingDescriptors(false)}>
              Cancel
            </Button>
            <Button onClick={saveDescriptors} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Descriptors'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
