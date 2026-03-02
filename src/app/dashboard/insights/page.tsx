'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Lightbulb,
  RefreshCw,
  Loader2,
  Sparkles,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Cloud,
  Calendar,
  DollarSign,
  Users,
  Star,
  Search,
  ChevronRight,
  Check,
  TrendingUp,
  Radar,
  Brain,
  LayoutList,
  Clock,
  Layers,
  Pin,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { useLocation } from '@/hooks/use-location'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Types
interface Insight {
  id: string
  title: string
  headline: string
  content: string
  detail?: string
  keyPoints?: string[]
  recommendations?: string[]
  recommendation?: string
  impact?: string
  layer: string
  status: 'active' | 'pinned' | 'stale' | 'hidden' | 'archived'
  expiresAt?: string
  isStale?: boolean
  insightType: string
  generatedAt: string
  feedback?: Array<{
    id: string
    rating: string
    userComment?: string
    createdAt: string
  }>
}

interface ConfidenceData {
  score: number
  level: string
  disclaimer: string
  connectedLayers: string[]
  missingLayers: Array<{ id: string; label: string }>
  nextRecommended: { id: string; label: string } | null
}

interface WeatherStatus {
  enabled: boolean
  hasCoordinates: boolean
  weatherDays?: number
}

// Data layer icons and descriptions
const dataLayerInfo: Record<string, { icon: typeof Cloud; description: string; comingSoon?: boolean }> = {
  weather: {
    icon: Cloud,
    description: 'Heat, rain & storm impact on your sales. Adds forecast-based predictions.',
  },
  events: {
    icon: Calendar,
    description: 'Spurs games, concerts, festivals, conventions.',
    comingSoon: true,
  },
  costs: {
    icon: DollarSign,
    description: 'Profit margins, food cost, labor analysis.',
    comingSoon: true,
  },
  customers: {
    icon: Users,
    description: 'No-shows, party sizes, customer behavior.',
    comingSoon: true,
  },
  reviews: {
    icon: Star,
    description: 'Reputation trends, sentiment, review response.',
    comingSoon: true,
  },
  visibility: {
    icon: Search,
    description: 'Search presence, online discoverability.',
    comingSoon: true,
  },
}

export default function InsightsPage() {
  const { currentLocation, isAllLocations } = useLocation()
  const locationId = currentLocation?.id

  // State
  const [insights, setInsights] = useState<Insight[]>([])
  const [confidence, setConfidence] = useState<ConfidenceData | null>(null)
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingSales, setGeneratingSales] = useState(false)
  const [generatingWeather, setGeneratingWeather] = useState(false)
  const [enablingWeather, setEnablingWeather] = useState(false)
  const [weatherProgress, setWeatherProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down' | 'saving'>>({})
  const [viewMode, setViewMode] = useState<'sections' | 'feed' | 'tabs'>('sections')
  const [activeTab, setActiveTab] = useState<'sales' | 'weather'>('sales')
  const [streamingText, setStreamingText] = useState<string>('')
  const [streamingStatus, setStreamingStatus] = useState<string>('')

  // Group insights by layer (sorted: pinned first, then by date)
  const salesInsights = insights
    .filter(i => i.layer === 'sales' || !i.layer)
    .sort((a, b) => {
      if (a.status === 'pinned' && b.status !== 'pinned') return -1
      if (b.status === 'pinned' && a.status !== 'pinned') return 1
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    })
  const weatherInsights = insights
    .filter(i => i.layer === 'weather')
    .sort((a, b) => {
      if (a.status === 'pinned' && b.status !== 'pinned') return -1
      if (b.status === 'pinned' && a.status !== 'pinned') return 1
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    })

  // Check if all insights in a layer are stale
  const allSalesStale = salesInsights.length > 0 && salesInsights.every(i => i.isStale)
  const allWeatherStale = weatherInsights.length > 0 && weatherInsights.every(i => i.isStale)

  // Get the main insight for each layer (prefer pinned)
  const mainSalesInsight = salesInsights.find(i =>
    i.keyPoints && i.keyPoints.length > 1 && i.recommendations && Array.isArray(i.recommendations) && i.recommendations.length > 0
  )
  const mainWeatherInsight = weatherInsights.find(i =>
    i.keyPoints && i.keyPoints.length > 1
  )

  // Fetch all data on mount
  const fetchData = useCallback(async () => {
    if (!locationId) return

    setLoading(true)
    setError(null)

    try {
      const [insightsRes, weatherRes] = await Promise.all([
        fetch(`/api/intelligence/generate?locationId=${locationId}`),
        fetch(`/api/weather/enable?locationId=${locationId}`),
      ])

      const insightsData = await insightsRes.json()
      const weatherData = await weatherRes.json()

      if (insightsRes.ok) {
        setInsights(insightsData.insights || [])
        setConfidence(insightsData.confidence || null)
      }

      if (weatherRes.ok) {
        setWeatherStatus({
          enabled: weatherData.enabled,
          hasCoordinates: weatherData.hasCoordinates,
          weatherDays: weatherData.weatherDays,
        })
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Generate sales insights with streaming
  const handleGenerateSalesInsights = async () => {
    if (!locationId) return

    setGeneratingSales(true)
    setError(null)
    setStreamingText('')
    setStreamingStatus('Starting...')

    try {
      const response = await fetch('/api/intelligence/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          dataType: 'combined',
          layer: 'sales',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate insights')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7)
            const dataLineIndex = lines.indexOf(line) + 1
            if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith('data: ')) {
              const dataStr = lines[dataLineIndex].slice(6)
              try {
                const data = JSON.parse(dataStr)

                if (eventType === 'status') {
                  setStreamingStatus(data.message)
                } else if (eventType === 'text') {
                  setStreamingText(prev => prev + data.chunk)
                } else if (eventType === 'confidence') {
                  setConfidence(prev => prev ? { ...prev, ...data } : data)
                } else if (eventType === 'insights') {
                  // Refresh insights from server
                  await fetchData()
                } else if (eventType === 'error') {
                  throw new Error(data.message)
                }
              } catch (parseErr) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }
      }

      setStreamingStatus('')
      setStreamingText('')
    } catch (err) {
      console.error('Failed to generate sales insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setGeneratingSales(false)
      setStreamingStatus('')
    }
  }

  // Generate weather insights with streaming
  const handleGenerateWeatherInsights = async () => {
    if (!locationId) return

    setGeneratingWeather(true)
    setError(null)
    setStreamingText('')
    setStreamingStatus('Starting...')

    try {
      const response = await fetch('/api/intelligence/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          dataType: 'combined',
          layer: 'weather',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate insights')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7)
            const dataLineIndex = lines.indexOf(line) + 1
            if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith('data: ')) {
              const dataStr = lines[dataLineIndex].slice(6)
              try {
                const data = JSON.parse(dataStr)

                if (eventType === 'status') {
                  setStreamingStatus(data.message)
                } else if (eventType === 'text') {
                  setStreamingText(prev => prev + data.chunk)
                } else if (eventType === 'confidence') {
                  setConfidence(prev => prev ? { ...prev, ...data } : data)
                } else if (eventType === 'insights') {
                  await fetchData()
                } else if (eventType === 'error') {
                  throw new Error(data.message)
                }
              } catch (parseErr) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      setStreamingStatus('')
      setStreamingText('')
    } catch (err) {
      console.error('Failed to generate weather insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setGeneratingWeather(false)
      setStreamingStatus('')
    }
  }

  // Enable weather
  const handleEnableWeather = async () => {
    if (!locationId) return

    setEnablingWeather(true)
    setWeatherProgress('Pulling weather data...')

    try {
      const enableRes = await fetch('/api/weather/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      })

      if (!enableRes.ok) {
        const data = await enableRes.json()
        throw new Error(data.error || 'Failed to enable weather')
      }

      setWeatherProgress('Analyzing correlations...')

      const insightsRes = await fetch('/api/intelligence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          dataType: 'combined',
          layer: 'weather',
          forceNew: true,
        }),
      })

      setWeatherProgress('Generating insights...')

      const insightsData = await insightsRes.json()

      if (insightsRes.ok) {
        // Add weather insights to existing sales insights
        const newWeatherInsights = (insightsData.insights || []).filter((i: Insight) => i.layer === 'weather')
        setInsights([...salesInsights, ...newWeatherInsights])
        setConfidence(insightsData.confidence || null)
      }

      // Refresh weather status
      const weatherRes = await fetch(`/api/weather/enable?locationId=${locationId}`)
      const weatherData = await weatherRes.json()
      if (weatherRes.ok) {
        setWeatherStatus({
          enabled: weatherData.enabled,
          hasCoordinates: weatherData.hasCoordinates,
          weatherDays: weatherData.weatherDays,
        })
      }
    } catch (err) {
      console.error('Failed to enable weather:', err)
      setError(err instanceof Error ? err.message : 'Failed to enable weather')
    } finally {
      setEnablingWeather(false)
      setWeatherProgress(null)
    }
  }

  // Handle feedback
  const handleFeedback = async (insightId: string, itemKey: string, rating: 'up' | 'down') => {
    setFeedbackState(prev => ({ ...prev, [itemKey]: 'saving' }))

    try {
      await fetch('/api/intelligence/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          insightId,
          rating: rating === 'up' ? 'helpful' : 'not_helpful',
        }),
      })
      setFeedbackState(prev => ({ ...prev, [itemKey]: rating }))
    } catch (err) {
      console.error('Failed to save feedback:', err)
      setFeedbackState(prev => {
        const newState = { ...prev }
        delete newState[itemKey]
        return newState
      })
    }
  }

  // Get confidence level colors
  const getConfidenceColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-blue-600'
    if (score >= 30) return 'text-amber-600'
    return 'text-gray-500'
  }

  // Get relative time string
  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getProgressColor = (score: number) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 50) return 'bg-blue-500'
    if (score >= 30) return 'bg-amber-500'
    return 'bg-gray-400'
  }

  // Render insight card
  const renderInsightCard = (insight: Insight, layer: string) => {
    if (!insight.keyPoints || insight.keyPoints.length <= 1) return null

    const isPinned = insight.status === 'pinned'
    const isStale = insight.isStale

    return (
      <div className={cn("space-y-4", isStale && "opacity-60")}>
        {/* Pinned badge */}
        {isPinned && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md w-fit">
            <Pin className="h-3 w-3" />
            Pinned
          </div>
        )}

        {insight.keyPoints.map((point, i) => {
          const feedbackKey = `${layer}-${insight.id}-${i}`
          const feedback = feedbackState[feedbackKey]
          return (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{point}</span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <span className="text-xs text-muted-foreground">Helpful?</span>
                <button
                  onClick={() => handleFeedback(insight.id, feedbackKey, 'up')}
                  disabled={feedback === 'saving' || isPinned}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    feedback === 'up' || isPinned
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                  title={isPinned ? 'Pinned' : 'Mark as helpful'}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback(insight.id, feedbackKey, 'down')}
                  disabled={feedback === 'saving' || isPinned}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    feedback === 'down'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                  title="Mark as not helpful"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
                {feedback && feedback !== 'saving' && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {feedback === 'up' ? 'Pinned!' : 'Hidden'}
                  </span>
                )}
                {feedback === 'saving' && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // No location selected
  if (isAllLocations || !currentLocation) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mx-auto w-fit rounded-full bg-primary/10 p-4 mb-4">
              <Lightbulb className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Select a Location</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Choose a specific location from the dropdown to view AI-powered insights.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading insights...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Lightbulb className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered intelligence for {currentLocation.name}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setViewMode('sections')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'sections'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Sections view"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('tabs')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'tabs'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Tabbed view"
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('feed')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'feed'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Timeline view"
          >
            <Clock className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Confidence Section */}
      {confidence && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-violet-600" />
              <span className="font-medium text-sm">Intelligence Confidence:</span>
              <span className={cn('font-bold', getConfidenceColor(confidence.score))}>
                {confidence.score}%
              </span>
              <span className="text-sm text-muted-foreground">{confidence.level}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', getProgressColor(confidence.score))}
                  style={{ width: `${confidence.score}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{confidence.disclaimer}</p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTIONS VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'sections' && (
        <>
          {/* Revenue & Operations Insights */}
          <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg">Revenue & Operations</CardTitle>
            </div>
            {salesInsights.length > 0 && (
              <span className="text-xs text-muted-foreground">From: Sales data</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stale insights banner */}
          {allSalesStale && !generatingSales && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Your sales insights are over 2 weeks old.</span>
              </div>
              <Button
                onClick={handleGenerateSalesInsights}
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-700"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          )}

          {generatingSales ? (
            <div className="space-y-4 py-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{streamingStatus || 'Generating insights...'}</p>
                  {streamingText && (
                    <p className="text-xs text-muted-foreground mt-1">
                      AI is writing{'.'.repeat((Date.now() / 500) % 4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : mainSalesInsight ? (
            <>
              <p className="text-sm text-muted-foreground">{mainSalesInsight.content}</p>
              {renderInsightCard(mainSalesInsight, 'sales')}

              {/* Actions with feedback */}
              {mainSalesInsight.recommendations && Array.isArray(mainSalesInsight.recommendations) && mainSalesInsight.recommendations.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Actions
                  </h4>
                  <div className="space-y-2">
                    {(mainSalesInsight.recommendations as string[]).slice(0, 3).map((rec, i) => {
                      const feedbackKey = `sales-action-${mainSalesInsight.id}-${i}`
                      const feedback = feedbackState[feedbackKey]
                      return (
                        <div key={i} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="flex-1">{rec}</span>
                          </div>
                          <div className="flex items-center gap-2 pl-6">
                            <span className="text-xs text-muted-foreground">Helpful?</span>
                            <button
                              onClick={() => handleFeedback(mainSalesInsight.id, feedbackKey, 'up')}
                              disabled={feedback === 'saving'}
                              className={cn(
                                'p-1.5 rounded-md transition-colors',
                                feedback === 'up'
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                  : 'hover:bg-muted text-muted-foreground'
                              )}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(mainSalesInsight.id, feedbackKey, 'down')}
                              disabled={feedback === 'saving'}
                              className={cn(
                                'p-1.5 rounded-md transition-colors',
                                feedback === 'down'
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                  : 'hover:bg-muted text-muted-foreground'
                              )}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                            {feedback && feedback !== 'saving' && (
                              <span className="text-xs text-muted-foreground ml-1">
                                {feedback === 'up' ? 'Thanks!' : 'Noted'}
                              </span>
                            )}
                            {feedback === 'saving' && (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerateSalesInsights}
                disabled={generatingSales}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className={cn('mr-2 h-3.5 w-3.5', generatingSales && 'animate-spin')} />
                Get More Revenue Insights
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                No sales insights yet. Generate them from your POS data.
              </p>
              <Button onClick={handleGenerateSalesInsights} disabled={generatingSales}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Revenue Insights
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Weather Impact Insights */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Weather Impact</CardTitle>
              {weatherStatus?.enabled && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                  <Check className="h-3 w-3" />
                  Enabled
                </span>
              )}
            </div>
            {weatherInsights.length > 0 && (
              <span className="text-xs text-muted-foreground">From: Sales + Weather</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stale weather insights banner */}
          {allWeatherStale && weatherStatus?.enabled && !generatingWeather && !enablingWeather && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Your weather insights are over 2 weeks old.</span>
              </div>
              <Button
                onClick={handleGenerateWeatherInsights}
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-700"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          )}

          {enablingWeather ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">{weatherProgress}</span>
            </div>
          ) : generatingWeather ? (
            <div className="space-y-4 py-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Cloud className="h-6 w-6 text-blue-600 animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center">
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{streamingStatus || 'Analyzing weather impact...'}</p>
                  {streamingText && (
                    <p className="text-xs text-muted-foreground mt-1">
                      AI is writing{'.'.repeat((Date.now() / 500) % 4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : !weatherStatus?.enabled ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">
                Weather intelligence not enabled yet.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {dataLayerInfo.weather.description}
              </p>
              <Button
                onClick={handleEnableWeather}
                disabled={!weatherStatus?.hasCoordinates}
              >
                <Cloud className="mr-2 h-4 w-4" />
                Enable Weather — Free
              </Button>
              {weatherStatus && !weatherStatus.hasCoordinates && (
                <p className="text-xs text-amber-600 mt-2">
                  Location coordinates required. Update in Settings.
                </p>
              )}
            </div>
          ) : mainWeatherInsight ? (
            <>
              <p className="text-sm text-muted-foreground">{mainWeatherInsight.content}</p>
              {renderInsightCard(mainWeatherInsight, 'weather')}

              {/* Weather Actions with feedback */}
              {mainWeatherInsight.recommendations && Array.isArray(mainWeatherInsight.recommendations) && mainWeatherInsight.recommendations.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Actions
                  </h4>
                  <div className="space-y-2">
                    {(mainWeatherInsight.recommendations as string[]).slice(0, 3).map((rec, i) => {
                      const feedbackKey = `weather-action-${mainWeatherInsight.id}-${i}`
                      const feedback = feedbackState[feedbackKey]
                      return (
                        <div key={i} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="flex-1">{rec}</span>
                          </div>
                          <div className="flex items-center gap-2 pl-6">
                            <span className="text-xs text-muted-foreground">Helpful?</span>
                            <button
                              onClick={() => handleFeedback(mainWeatherInsight.id, feedbackKey, 'up')}
                              disabled={feedback === 'saving'}
                              className={cn(
                                'p-1.5 rounded-md transition-colors',
                                feedback === 'up'
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                  : 'hover:bg-muted text-muted-foreground'
                              )}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(mainWeatherInsight.id, feedbackKey, 'down')}
                              disabled={feedback === 'saving'}
                              className={cn(
                                'p-1.5 rounded-md transition-colors',
                                feedback === 'down'
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                  : 'hover:bg-muted text-muted-foreground'
                              )}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                            {feedback && feedback !== 'saving' && (
                              <span className="text-xs text-muted-foreground ml-1">
                                {feedback === 'up' ? 'Thanks!' : 'Noted'}
                              </span>
                            )}
                            {feedback === 'saving' && (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerateWeatherInsights}
                disabled={generatingWeather}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className={cn('mr-2 h-3.5 w-3.5', generatingWeather && 'animate-spin')} />
                Get More Weather Insights
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                Weather is enabled but no insights generated yet.
              </p>
              <Button onClick={handleGenerateWeatherInsights} disabled={generatingWeather}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Weather Insights
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Unlock More Intelligence Section */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Unlock More Intelligence</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Coming Soon Data Layers */}
          {Object.entries(dataLayerInfo)
            .filter(([id]) => id !== 'weather')
            .map(([id, info]) => {
              const IconComponent = info.icon

              return (
                <div key={id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground capitalize">
                        {id === 'costs' ? 'Accounting / Costs' : id.replace('_', ' ')}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
                    Coming Soon
                  </span>
                </div>
              )
            })}
        </CardContent>
      </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TABS VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'tabs' && (
        <Card>
          {/* Tab Bar */}
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('sales')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'sales'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Revenue & Operations
                {salesInsights.length > 0 && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {salesInsights.filter(i => i.keyPoints && i.keyPoints.length > 0).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('weather')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'weather'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Cloud className="h-4 w-4" />
                Weather Impact
                {weatherStatus?.enabled && (
                  <Check className="h-3 w-3 text-green-600" />
                )}
                {weatherInsights.length > 0 && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {weatherInsights.filter(i => i.keyPoints && i.keyPoints.length > 0).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            {/* Sales Tab Content */}
            {activeTab === 'sales' && (
              <>
                {generatingSales ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Generating insights...</span>
                  </div>
                ) : mainSalesInsight ? (
                  <>
                    <p className="text-sm text-muted-foreground">{mainSalesInsight.content}</p>
                    {renderInsightCard(mainSalesInsight, 'sales')}

                    {/* Actions */}
                    {mainSalesInsight.recommendations && Array.isArray(mainSalesInsight.recommendations) && mainSalesInsight.recommendations.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Zap className="h-4 w-4 text-amber-500" />
                          Actions
                        </h4>
                        <div className="space-y-2">
                          {(mainSalesInsight.recommendations as string[]).slice(0, 3).map((rec, i) => {
                            const feedbackKey = `tabs-sales-action-${mainSalesInsight.id}-${i}`
                            const feedback = feedbackState[feedbackKey]
                            return (
                              <div key={i} className="rounded-lg border p-3 space-y-2">
                                <div className="flex items-start gap-2 text-sm">
                                  <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span className="flex-1">{rec}</span>
                                </div>
                                <div className="flex items-center gap-2 pl-6">
                                  <span className="text-xs text-muted-foreground">Helpful?</span>
                                  <button
                                    onClick={() => handleFeedback(mainSalesInsight.id, feedbackKey, 'up')}
                                    disabled={feedback === 'saving'}
                                    className={cn(
                                      'p-1.5 rounded-md transition-colors',
                                      feedback === 'up'
                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                        : 'hover:bg-muted text-muted-foreground'
                                    )}
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(mainSalesInsight.id, feedbackKey, 'down')}
                                    disabled={feedback === 'saving'}
                                    className={cn(
                                      'p-1.5 rounded-md transition-colors',
                                      feedback === 'down'
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                        : 'hover:bg-muted text-muted-foreground'
                                    )}
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </button>
                                  {feedback && feedback !== 'saving' && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {feedback === 'up' ? 'Thanks!' : 'Noted'}
                                    </span>
                                  )}
                                  {feedback === 'saving' && (
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleGenerateSalesInsights}
                      disabled={generatingSales}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <RefreshCw className={cn('mr-2 h-3.5 w-3.5', generatingSales && 'animate-spin')} />
                      Get More Revenue Insights
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      No sales insights yet. Generate them from your POS data.
                    </p>
                    <Button onClick={handleGenerateSalesInsights} disabled={generatingSales}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Revenue Insights
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Weather Tab Content */}
            {activeTab === 'weather' && (
              <>
                {enablingWeather ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">{weatherProgress}</span>
                  </div>
                ) : generatingWeather ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Generating weather insights...</span>
                  </div>
                ) : !weatherStatus?.enabled ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-2">
                      Weather intelligence not enabled yet.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {dataLayerInfo.weather.description}
                    </p>
                    <Button
                      onClick={handleEnableWeather}
                      disabled={!weatherStatus?.hasCoordinates}
                    >
                      <Cloud className="mr-2 h-4 w-4" />
                      Enable Weather — Free
                    </Button>
                    {weatherStatus && !weatherStatus.hasCoordinates && (
                      <p className="text-xs text-amber-600 mt-2">
                        Location coordinates required. Update in Settings.
                      </p>
                    )}
                  </div>
                ) : mainWeatherInsight ? (
                  <>
                    <p className="text-sm text-muted-foreground">{mainWeatherInsight.content}</p>
                    {renderInsightCard(mainWeatherInsight, 'weather')}

                    {/* Weather Actions */}
                    {mainWeatherInsight.recommendations && Array.isArray(mainWeatherInsight.recommendations) && mainWeatherInsight.recommendations.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Zap className="h-4 w-4 text-amber-500" />
                          Actions
                        </h4>
                        <div className="space-y-2">
                          {(mainWeatherInsight.recommendations as string[]).slice(0, 3).map((rec, i) => {
                            const feedbackKey = `tabs-weather-action-${mainWeatherInsight.id}-${i}`
                            const feedback = feedbackState[feedbackKey]
                            return (
                              <div key={i} className="rounded-lg border p-3 space-y-2">
                                <div className="flex items-start gap-2 text-sm">
                                  <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span className="flex-1">{rec}</span>
                                </div>
                                <div className="flex items-center gap-2 pl-6">
                                  <span className="text-xs text-muted-foreground">Helpful?</span>
                                  <button
                                    onClick={() => handleFeedback(mainWeatherInsight.id, feedbackKey, 'up')}
                                    disabled={feedback === 'saving'}
                                    className={cn(
                                      'p-1.5 rounded-md transition-colors',
                                      feedback === 'up'
                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                        : 'hover:bg-muted text-muted-foreground'
                                    )}
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(mainWeatherInsight.id, feedbackKey, 'down')}
                                    disabled={feedback === 'saving'}
                                    className={cn(
                                      'p-1.5 rounded-md transition-colors',
                                      feedback === 'down'
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                        : 'hover:bg-muted text-muted-foreground'
                                    )}
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </button>
                                  {feedback && feedback !== 'saving' && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {feedback === 'up' ? 'Thanks!' : 'Noted'}
                                    </span>
                                  )}
                                  {feedback === 'saving' && (
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleGenerateWeatherInsights}
                      disabled={generatingWeather}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <RefreshCw className={cn('mr-2 h-3.5 w-3.5', generatingWeather && 'animate-spin')} />
                      Get More Weather Insights
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      Weather is enabled but no insights generated yet.
                    </p>
                    <Button onClick={handleGenerateWeatherInsights} disabled={generatingWeather}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Weather Insights
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FEED VIEW */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'feed' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">All Insights</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleGenerateSalesInsights}
                  disabled={generatingSales || generatingWeather}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={cn('mr-2 h-3.5 w-3.5', generatingSales && 'animate-spin')} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No insights yet. Generate some to get started.
                </p>
                <Button onClick={handleGenerateSalesInsights} disabled={generatingSales}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Insights
                </Button>
              </div>
            ) : (
              [...insights]
                // Only show insights with substance (keyPoints)
                .filter(insight => insight.keyPoints && insight.keyPoints.length > 0)
                .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
                .map((insight) => {
                  const layerIcon = insight.layer === 'weather' ? Cloud : TrendingUp
                  const LayerIcon = layerIcon
                  const layerColor = insight.layer === 'weather' ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' : 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30'
                  const layerLabel = insight.layer === 'weather' ? 'Weather' : 'Sales'
                  const timeAgo = getTimeAgo(new Date(insight.generatedAt))

                  return (
                    <div key={insight.id} className="rounded-lg border p-4 space-y-3">
                      {/* Header with layer tag and timestamp */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', layerColor)}>
                            <LayerIcon className="h-3 w-3" />
                            {layerLabel}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                      </div>

                      {/* Title and content */}
                      <div>
                        <h3 className="font-medium text-sm">{insight.title || insight.headline}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{insight.content}</p>
                      </div>

                      {/* Key points */}
                      {insight.keyPoints && insight.keyPoints.length > 0 && (
                        <div className="space-y-2">
                          {insight.keyPoints.slice(0, 3).map((point, i) => {
                            const feedbackKey = `feed-${insight.id}-${i}`
                            const feedback = feedbackState[feedbackKey]
                            return (
                              <div key={i} className="flex items-start justify-between gap-2 text-sm pl-2 border-l-2 border-muted">
                                <span className="flex-1 text-muted-foreground">{point}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleFeedback(insight.id, feedbackKey, 'up')}
                                    disabled={feedback === 'saving'}
                                    className={cn(
                                      'p-1 rounded transition-colors',
                                      feedback === 'up'
                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                        : 'hover:bg-muted text-muted-foreground'
                                    )}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(insight.id, feedbackKey, 'down')}
                                    disabled={feedback === 'saving'}
                                    className={cn(
                                      'p-1 rounded transition-colors',
                                      feedback === 'down'
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                        : 'hover:bg-muted text-muted-foreground'
                                    )}
                                  >
                                    <ThumbsDown className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Actions/Recommendations */}
                      {insight.recommendations && Array.isArray(insight.recommendations) && insight.recommendations.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-1 text-xs font-medium text-amber-600 mb-2">
                            <Zap className="h-3 w-3" />
                            Actions
                          </div>
                          {(insight.recommendations as string[]).slice(0, 2).map((rec, i) => {
                            const feedbackKey = `feed-action-${insight.id}-${i}`
                            const feedback = feedbackState[feedbackKey]
                            return (
                              <div key={i} className="flex items-start justify-between gap-2 text-sm mb-1">
                                <span className="flex-1 text-muted-foreground">• {rec}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleFeedback(insight.id, feedbackKey, 'up')}
                                    disabled={feedback === 'saving'}
                                    className={cn(
                                      'p-1 rounded transition-colors',
                                      feedback === 'up'
                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                        : 'hover:bg-muted text-muted-foreground'
                                    )}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(insight.id, feedbackKey, 'down')}
                                    disabled={feedback === 'saving'}
                                    className={cn(
                                      'p-1 rounded transition-colors',
                                      feedback === 'down'
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                        : 'hover:bg-muted text-muted-foreground'
                                    )}
                                  >
                                    <ThumbsDown className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
            )}
          </CardContent>
        </Card>
      )}

      {/* Settings Link */}
      <div className="text-center">
        <Link
          href="/dashboard/settings/intelligence"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Edit what Prometheus knows about you
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
