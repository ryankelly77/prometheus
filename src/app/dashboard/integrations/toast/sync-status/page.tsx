'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, Loader2, ArrowLeft, RefreshCw, ChevronRight, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface MonthStatus {
  label: string
  startDate: string
  endDate: string
  status: 'not_synced' | 'synced' | 'syncing' | 'error' | 'queued'
  daysWithData: number
  netSales: number
  orderCount: number
  syncedAt: string | null
  error?: string
  // Progress details when syncing
  fetchingPage?: number
  ordersLoaded?: number
  processingDay?: number
  processingTotalDays?: number
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
    periodStart: string
    periodEnd: string
    durationMs: number
  }
  error?: string
}

function getLast12Months(): { label: string; startDate: Date; endDate: Date }[] {
  const months: { label: string; startDate: Date; endDate: Date }[] = []
  const now = new Date()

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    // For current month, end is today
    const effectiveEnd = i === 0 ? now : end
    const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    months.push({ label, startDate: start, endDate: effectiveEnd })
  }

  // Return in chronological order (oldest first)
  return months.reverse()
}

export default function ToastSyncStatusPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const integrationId = searchParams.get('integrationId')
  const autoStart = searchParams.get('autoStart') === 'true'

  const [months, setMonths] = useState<MonthStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentMonthIndex, setCurrentMonthIndex] = useState(-1)
  const [overallProgress, setOverallProgress] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const hasAutoStarted = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch initial sync status
  useEffect(() => {
    if (!integrationId) return

    async function fetchSyncStatus() {
      try {
        const response = await fetch(`/api/integrations/toast/sync-status?integrationId=${integrationId}`)
        const data = await response.json()

        if (data.success && data.months) {
          setMonths(data.months.map((m: MonthStatus) => ({
            ...m,
            status: m.status === 'synced' ? 'synced' : 'not_synced',
          })))
        }
      } catch (error) {
        console.error('Failed to fetch sync status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSyncStatus()
  }, [integrationId])

  // Track elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSyncing && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSyncing, startTime])

  // Parse SSE events from response text
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
  const syncMonth = useCallback(async (month: { label: string; startDate: Date; endDate: Date }) => {
    if (!integrationId) return false

    // Update month status to syncing
    setMonths(prev => prev.map(m =>
      m.label === month.label ? { ...m, status: 'syncing' as const, error: undefined } : m
    ))

    try {
      const params = new URLSearchParams({
        integrationId,
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
      if (!reader) {
        throw new Error('No response stream')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = parseSSEEvents(buffer)
        buffer = ''

        for (const event of events) {
          if (event.phase === 'fetching') {
            setMonths(prev => prev.map(m =>
              m.label === month.label
                ? { ...m, fetchingPage: event.fetchingPage, ordersLoaded: event.ordersLoaded }
                : m
            ))
          } else if (event.phase === 'processing' || event.phase === 'saving') {
            setMonths(prev => prev.map(m =>
              m.label === month.label
                ? { ...m, processingDay: event.currentDay, processingTotalDays: event.totalDays, ordersLoaded: event.ordersProcessed }
                : m
            ))
          } else if (event.phase === 'complete' && event.summary) {
            setMonths(prev => prev.map(m =>
              m.label === month.label
                ? {
                    ...m,
                    status: 'synced' as const,
                    netSales: event.summary!.netSales,
                    orderCount: event.summary!.orderCount,
                    daysWithData: event.totalDays,
                    syncedAt: new Date().toISOString(),
                    fetchingPage: undefined,
                    ordersLoaded: undefined,
                    processingDay: undefined,
                    processingTotalDays: undefined,
                  }
                : m
            ))
            return true
          } else if (event.phase === 'error') {
            throw new Error(event.error || 'Sync failed')
          }
        }
      }

      return true
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setMonths(prev => prev.map(m =>
          m.label === month.label ? { ...m, status: 'not_synced' as const, error: 'Cancelled' } : m
        ))
        return false
      }

      setMonths(prev => prev.map(m =>
        m.label === month.label
          ? { ...m, status: 'error' as const, error: (error as Error).message }
          : m
      ))
      console.error(`Failed to sync ${month.label}:`, error)
      return false // Don't stop - continue to next month
    }
  }, [integrationId])

  // Run backfill for all unsynced months
  const runBackfill = useCallback(async () => {
    if (!integrationId || isSyncing) return

    const allMonths = getLast12Months()

    // Filter to only months that need syncing
    const monthsToSync = allMonths.filter(m => {
      const existing = months.find(em => em.label === m.label)
      return !existing || existing.status !== 'synced'
    })

    if (monthsToSync.length === 0) {
      return
    }

    // Mark remaining months as queued
    setMonths(prev => prev.map(m => {
      const needsSync = monthsToSync.find(ms => ms.label === m.label)
      return needsSync ? { ...m, status: 'queued' as const } : m
    }))

    setIsSyncing(true)
    setStartTime(new Date())

    for (let i = 0; i < monthsToSync.length; i++) {
      const month = monthsToSync[i]
      setCurrentMonthIndex(i)
      setOverallProgress(Math.round((i / monthsToSync.length) * 100))

      await syncMonth(month)

      // Small delay between months to be kind to the API
      if (i < monthsToSync.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    setOverallProgress(100)
    setIsSyncing(false)
    setCurrentMonthIndex(-1)
  }, [integrationId, isSyncing, months, syncMonth])

  // Auto-start backfill if specified
  useEffect(() => {
    if (autoStart && !isLoading && !hasAutoStarted.current && months.length > 0) {
      hasAutoStarted.current = true
      runBackfill()
    }
  }, [autoStart, isLoading, months.length, runBackfill])

  // Stop sync
  const stopSync = () => {
    abortControllerRef.current?.abort()
    setIsSyncing(false)
    setCurrentMonthIndex(-1)
  }

  // Retry a single failed month
  const retryMonth = async (monthLabel: string) => {
    const allMonths = getLast12Months()
    const month = allMonths.find(m => m.label === monthLabel)
    if (month) {
      setIsSyncing(true)
      await syncMonth(month)
      setIsSyncing(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate totals
  const syncedMonths = months.filter(m => m.status === 'synced')
  const unsyncedMonths = months.filter(m => m.status !== 'synced')
  const totalNetSales = syncedMonths.reduce((sum, m) => sum + m.netSales, 0)
  const totalOrders = syncedMonths.reduce((sum, m) => sum + m.orderCount, 0)
  const isComplete = unsyncedMonths.length === 0 && months.length === 12

  if (!integrationId) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Missing integration ID</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard/settings?tab=integrations')}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading sync status...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <img src="/integrations/toast.svg" alt="Toast" className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Toast Sync Status</h1>
              <p className="text-sm text-muted-foreground">12-month historical data import</p>
            </div>
          </div>
        </div>
        {!isSyncing && unsyncedMonths.length > 0 && (
          <Button onClick={runBackfill}>
            <Play className="mr-2 h-4 w-4" />
            Sync {unsyncedMonths.length === 12 ? 'All' : `Remaining ${unsyncedMonths.length}`} Months
          </Button>
        )}
        {isSyncing && (
          <Button variant="destructive" onClick={stopSync}>
            Stop Sync
          </Button>
        )}
      </div>

      {/* Overall Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Overall Progress</CardTitle>
            {isSyncing && (
              <span className="text-sm text-muted-foreground">
                Elapsed: {formatDuration(elapsedTime)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={isSyncing ? overallProgress : (syncedMonths.length / 12) * 100} className="h-3" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {isComplete
                ? 'All months synced'
                : isSyncing
                ? `Syncing month ${currentMonthIndex + 1} of ${unsyncedMonths.length}...`
                : `${syncedMonths.length} of 12 months synced`}
            </span>
            <span className="font-medium">{Math.round((syncedMonths.length / 12) * 100)}%</span>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{syncedMonths.length}/12</p>
              <p className="text-xs text-muted-foreground">Months</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{totalOrders.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Orders Synced</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalNetSales)}</p>
              <p className="text-xs text-muted-foreground">Net Sales</p>
            </div>
          </div>

          {/* Success message */}
          {isComplete && !isSyncing && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4 border border-green-200 dark:border-green-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">Sync Complete!</p>
                  <p className="text-sm text-green-600 dark:text-green-400/80 mt-1">
                    Successfully imported {totalOrders.toLocaleString()} orders totaling {formatCurrency(totalNetSales)}
                  </p>
                </div>
              </div>
              <Button className="mt-3" onClick={() => router.push('/dashboard/sales/data')}>
                View Sales Data
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Progress</CardTitle>
          <CardDescription>Each month is synced sequentially to stay within API limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {months.map((month) => (
              <div
                key={month.label}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg transition-colors',
                  month.status === 'syncing' && 'bg-blue-50 dark:bg-blue-950/20',
                  month.status === 'synced' && 'bg-green-50/50 dark:bg-green-950/10',
                  month.status === 'error' && 'bg-red-50/50 dark:bg-red-950/10',
                  month.status === 'queued' && 'bg-muted/30',
                  month.status === 'not_synced' && 'bg-muted/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {month.status === 'not_synced' && (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                    {month.status === 'queued' && (
                      <div className="w-2 h-2 rounded-full bg-blue-400/50" />
                    )}
                    {month.status === 'syncing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    {month.status === 'synced' && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {month.status === 'error' && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <span
                      className={cn(
                        'font-medium',
                        month.status === 'not_synced' && 'text-muted-foreground',
                        month.status === 'queued' && 'text-muted-foreground',
                        month.status === 'syncing' && 'text-blue-700 dark:text-blue-400',
                        month.status === 'error' && 'text-red-700 dark:text-red-400'
                      )}
                    >
                      {month.label}
                    </span>
                    {month.status === 'error' && month.error && (
                      <p className="text-xs text-red-600 dark:text-red-400">{month.error}</p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  {month.status === 'synced' && (
                    <div className="text-muted-foreground">
                      <span className="font-medium tabular-nums">
                        {formatCurrency(month.netSales)}
                      </span>
                      {' · '}
                      <span className="tabular-nums">{month.orderCount.toLocaleString()} orders</span>
                      {month.syncedAt && (
                        <span className="block text-xs">
                          Synced {format(new Date(month.syncedAt), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  )}
                  {month.status === 'syncing' && (
                    <span className="text-blue-600 dark:text-blue-400 tabular-nums">
                      {month.ordersLoaded !== undefined
                        ? `${month.ordersLoaded.toLocaleString()} orders loaded...`
                        : month.processingDay !== undefined
                        ? `Processing day ${month.processingDay}/${month.processingTotalDays}...`
                        : 'Connecting...'}
                    </span>
                  )}
                  {month.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => retryMonth(month.label)}
                      disabled={isSyncing}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Retry
                    </Button>
                  )}
                  {month.status === 'not_synced' && !isSyncing && (
                    <span className="text-muted-foreground">Not synced</span>
                  )}
                  {month.status === 'queued' && (
                    <span className="text-muted-foreground">Queued</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Back to Settings */}
      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => router.push('/dashboard/settings?tab=integrations')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Integration Settings
        </Button>
      </div>
    </div>
  )
}
