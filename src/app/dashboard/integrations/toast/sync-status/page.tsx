'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, Loader2, ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface MonthProgress {
  label: string
  status: 'pending' | 'in_progress' | 'complete' | 'error'
  netSales?: number
  orderCount?: number
  daysProcessed?: number
}

interface BackfillProgress {
  phase: 'initializing' | 'month_start' | 'fetching' | 'processing' | 'month_complete' | 'backfill_complete' | 'error'
  message: string
  currentMonth: number
  totalMonths: number
  monthLabel?: string
  percentComplete: number
  ordersLoaded?: number
  fetchingPage?: number
  monthNetSales?: number
  monthOrderCount?: number
  monthDaysProcessed?: number
  summary?: {
    totalNetSales: number
    totalOrderCount: number
    totalDaysProcessed: number
    monthsCompleted: number
    durationMs: number
  }
  error?: string
}

export default function ToastSyncStatusPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const integrationId = searchParams.get('integrationId')
  const autoStart = searchParams.get('autoStart') === 'true'

  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle')
  const [progress, setProgress] = useState<BackfillProgress | null>(null)
  const [months, setMonths] = useState<MonthProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const hasStartedRef = useRef(false)

  // Initialize months list
  useEffect(() => {
    const monthsList: MonthProgress[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      monthsList.push({ label, status: 'pending' })
    }
    setMonths(monthsList)
  }, [])

  // Track elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === 'running' && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [status, startTime])

  const startBackfill = useCallback(async () => {
    if (!integrationId || status === 'running') return

    setStatus('running')
    setStartTime(new Date())
    setError(null)

    try {
      const response = await fetch('/api/integrations/toast/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
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
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: BackfillProgress = JSON.parse(line.slice(6))
              setProgress(data)

              // Update months list based on progress
              if (data.phase === 'month_start' && data.monthLabel) {
                setMonths((prev) =>
                  prev.map((m) =>
                    m.label === data.monthLabel ? { ...m, status: 'in_progress' } : m
                  )
                )
              } else if (data.phase === 'month_complete' && data.monthLabel) {
                setMonths((prev) =>
                  prev.map((m) =>
                    m.label === data.monthLabel
                      ? {
                          ...m,
                          status: 'complete',
                          netSales: data.monthNetSales,
                          orderCount: data.monthOrderCount,
                          daysProcessed: data.monthDaysProcessed,
                        }
                      : m
                  )
                )
              } else if (data.phase === 'backfill_complete') {
                setStatus('complete')
              } else if (data.phase === 'error') {
                setStatus('error')
                setError(data.error || 'Unknown error')
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to start backfill')
    }
  }, [integrationId, status])

  // Auto-start backfill if specified
  useEffect(() => {
    if (autoStart && integrationId && status === 'idle' && !hasStartedRef.current) {
      hasStartedRef.current = true
      startBackfill()
    }
  }, [autoStart, integrationId, status, startBackfill])

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
        {status === 'idle' && (
          <Button onClick={startBackfill}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Start Sync
          </Button>
        )}
      </div>

      {/* Overall Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Overall Progress</CardTitle>
            {status === 'running' && (
              <span className="text-sm text-muted-foreground">
                Elapsed: {formatDuration(elapsedTime)}
              </span>
            )}
            {status === 'complete' && progress?.summary && (
              <span className="text-sm text-muted-foreground">
                Completed in {formatDuration(Math.round(progress.summary.durationMs / 1000))}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress?.percentComplete ?? 0} className="h-3" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {progress?.message || (status === 'idle' ? 'Ready to start' : 'Initializing...')}
            </span>
            <span className="font-medium">{progress?.percentComplete ?? 0}%</span>
          </div>

          {/* Summary stats when running or complete */}
          {(status === 'running' || status === 'complete') && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums">
                  {progress?.currentMonth ?? 0}/{progress?.totalMonths ?? 12}
                </p>
                <p className="text-xs text-muted-foreground">Months</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums">
                  {months
                    .filter((m) => m.status === 'complete')
                    .reduce((sum, m) => sum + (m.orderCount ?? 0), 0)
                    .toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Orders Synced</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(
                    months
                      .filter((m) => m.status === 'complete')
                      .reduce((sum, m) => sum + (m.netSales ?? 0), 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Net Sales</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {status === 'error' && error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 border border-red-200 dark:border-red-900">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">Sync Failed</p>
                  <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setStatus('idle')
                  setError(null)
                  hasStartedRef.current = false
                }}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          )}

          {/* Success message */}
          {status === 'complete' && progress?.summary && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4 border border-green-200 dark:border-green-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Sync Complete!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400/80 mt-1">
                    Successfully imported {progress.summary.totalOrderCount.toLocaleString()} orders
                    across {progress.summary.totalDaysProcessed} days
                  </p>
                </div>
              </div>
              <Button
                className="mt-3"
                onClick={() => router.push('/dashboard/sales/data')}
              >
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
            {months.map((month, index) => (
              <div
                key={month.label}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg transition-colors',
                  month.status === 'in_progress' && 'bg-blue-50 dark:bg-blue-950/20',
                  month.status === 'complete' && 'bg-green-50/50 dark:bg-green-950/10',
                  month.status === 'pending' && 'bg-muted/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {month.status === 'pending' && (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                    {month.status === 'in_progress' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    {month.status === 'complete' && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {month.status === 'error' && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-medium',
                      month.status === 'pending' && 'text-muted-foreground',
                      month.status === 'in_progress' && 'text-blue-700 dark:text-blue-400'
                    )}
                  >
                    {month.label}
                  </span>
                </div>
                <div className="text-right text-sm">
                  {month.status === 'complete' && (
                    <div className="text-muted-foreground">
                      <span className="font-medium tabular-nums">
                        {month.orderCount?.toLocaleString() ?? 0}
                      </span>{' '}
                      orders &middot;{' '}
                      <span className="font-medium tabular-nums">
                        {formatCurrency(month.netSales ?? 0)}
                      </span>
                    </div>
                  )}
                  {month.status === 'in_progress' && progress?.ordersLoaded && (
                    <span className="text-blue-600 dark:text-blue-400 tabular-nums">
                      {progress.ordersLoaded.toLocaleString()} orders loaded...
                    </span>
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
