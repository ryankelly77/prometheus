'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  History,
  Loader2,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Zap,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import Link from 'next/link' // Used in feedback "Add to Profile" links
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  insightType: string
  generatedAt: string
  feedback?: Array<{
    id: string
    rating: string
    userComment?: string
    createdAt: string
  }>
}

interface InsightsPanelProps {
  locationId: string
  locationName?: string
  className?: string
}

export function InsightsPanel({ locationId, locationName, className }: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [historicalCount, setHistoricalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down' | 'saving'>>({})

  // Fetch existing insights on mount
  const fetchInsights = useCallback(async () => {
    if (!locationId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/intelligence/generate?locationId=${locationId}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('Insights API error:', { status: response.status, data })
        throw new Error(data.error || data.details || `HTTP ${response.status}`)
      }

      setInsights(data.insights || [])
      setGeneratedAt(data.generatedAt)
      setHistoricalCount(data.historicalCount || 0)
    } catch (err) {
      console.error('Failed to fetch insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch insights')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  // Generate new insights
  const handleGenerateInsights = async () => {
    if (!locationId) return

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/intelligence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          dataType: 'combined',
          forceNew: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate insights')
      }

      setInsights(data.insights || [])
      setGeneratedAt(data.generatedAt)
      setHistoricalCount(data.historicalCount || 0)
    } catch (err) {
      console.error('Failed to generate insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setGenerating(false)
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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Get the main summary insight (the one with multiple keyPoints AND recommendations)
  const mainInsight = insights.find(i =>
    i.keyPoints &&
    i.keyPoints.length > 1 &&
    i.recommendations &&
    Array.isArray(i.recommendations) &&
    i.recommendations.length > 0
  )

  // Loading state
  if (loading) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading insights...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mx-auto w-fit rounded-full bg-red-100 dark:bg-red-900/30 p-3 mb-4">
              <Sparkles className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchInsights}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Generating state
  if (generating) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mx-auto w-fit rounded-full bg-primary/10 p-3 mb-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Analyzing Your Data</h2>
            <p className="text-sm text-muted-foreground">
              Generating AI-powered insights from your restaurant data...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No insights yet
  if (!mainInsight) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mx-auto w-fit rounded-full bg-primary/10 p-3 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Insights Yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Generate AI-powered insights based on your restaurant&apos;s sales data.
            </p>
            <Button onClick={handleGenerateInsights} size="lg">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Has insights - display in onboarding format
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1 space-y-2">
          <div className="mx-auto w-fit rounded-full bg-green-100 dark:bg-green-900/30 p-3">
            <Sparkles className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Your Insights</h1>
          <p className="text-muted-foreground">
            Here&apos;s what we discovered from your data
            {generatedAt && (
              <span className="text-xs ml-2">· Generated {formatDate(generatedAt)}</span>
            )}
          </p>
        </div>
      </div>

      {/* Main Insight Card */}
      <Card className="border-green-200 dark:border-green-900">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                {mainInsight.title}
              </CardTitle>
              <CardDescription className="mt-2">{mainInsight.content}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateInsights}
              className="shrink-0 ml-4"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Get New Insights
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Insights */}
          {mainInsight.keyPoints && mainInsight.keyPoints.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Key Insights</h4>
              <ul className="space-y-3">
                {mainInsight.keyPoints.map((insight, i) => {
                  const feedbackKey = `insight-${mainInsight.id}-${i}`
                  const feedback = feedbackState[feedbackKey]
                  return (
                    <li key={i} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{insight}</span>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <span className="text-xs text-muted-foreground">Helpful?</span>
                        <button
                          onClick={() => handleFeedback(mainInsight.id, feedbackKey, 'up')}
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
                          onClick={() => handleFeedback(mainInsight.id, feedbackKey, 'down')}
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
                          <>
                            <span className="text-xs text-muted-foreground ml-1">
                              {feedback === 'up' ? 'Thanks!' : 'Noted'}
                            </span>
                            <Link
                              href="/dashboard/settings/intelligence"
                              className="text-xs text-primary hover:underline ml-2"
                            >
                              Add to Profile
                            </Link>
                          </>
                        )}
                        {feedback === 'saving' && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Actionable Recommendations */}
          {mainInsight.recommendations && Array.isArray(mainInsight.recommendations) && mainInsight.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Actionable Things You Can Do</h4>
              <ul className="space-y-3">
                {(mainInsight.recommendations as string[]).map((rec, i) => {
                  const feedbackKey = `rec-${mainInsight.id}-${i}`
                  const feedback = feedbackState[feedbackKey]
                  return (
                    <li key={i} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{rec}</span>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <span className="text-xs text-muted-foreground">Helpful?</span>
                        <button
                          onClick={() => handleFeedback(mainInsight.id, feedbackKey, 'up')}
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
                          onClick={() => handleFeedback(mainInsight.id, feedbackKey, 'down')}
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
                          <>
                            <span className="text-xs text-muted-foreground ml-1">
                              {feedback === 'up' ? 'Thanks!' : 'Noted'}
                            </span>
                            <Link
                              href="/dashboard/settings/intelligence"
                              className="text-xs text-primary hover:underline ml-2"
                            >
                              Add to Profile
                            </Link>
                          </>
                        )}
                        {feedback === 'saving' && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer with history count */}
      {historicalCount > 0 && (
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <History className="h-3.5 w-3.5 mr-1.5" />
          {historicalCount} previous insight{historicalCount !== 1 ? 's' : ''} generated
        </div>
      )}
    </div>
  )
}
