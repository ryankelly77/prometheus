'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { CalendarIcon, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface SyncProgress {
  phase: 'connecting' | 'fetching' | 'processing' | 'saving' | 'complete' | 'error'
  message: string
  ordersProcessed: number
  totalDays: number
  currentDay: number
  percentComplete: number
  error?: string
}

interface ToastSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  integrationId: string
  locationName?: string
  onSyncComplete?: () => void
}

type PresetRange = '1month' | '3months' | '6months' | '12months' | 'custom'

export function ToastSyncModal({
  open,
  onOpenChange,
  integrationId,
  locationName,
  onSyncComplete,
}: ToastSyncModalProps) {
  const [step, setStep] = useState<'config' | 'syncing' | 'complete' | 'error'>('config')
  const [presetRange, setPresetRange] = useState<PresetRange>('3months')
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 3))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('config')
      setPresetRange('3months')
      setStartDate(subMonths(new Date(), 3))
      setEndDate(new Date())
      setProgress(null)
    }
  }, [open])

  // Handle preset range changes
  const handlePresetChange = (value: PresetRange) => {
    setPresetRange(value)
    const now = new Date()
    const endOfCurrentMonth = endOfMonth(now)

    switch (value) {
      case '1month':
        setStartDate(startOfMonth(now))
        setEndDate(endOfCurrentMonth)
        break
      case '3months':
        setStartDate(startOfMonth(subMonths(now, 2)))
        setEndDate(endOfCurrentMonth)
        break
      case '6months':
        setStartDate(startOfMonth(subMonths(now, 5)))
        setEndDate(endOfCurrentMonth)
        break
      case '12months':
        setStartDate(startOfMonth(subMonths(now, 11)))
        setEndDate(endOfCurrentMonth)
        break
      case 'custom':
        // Keep current dates
        break
    }
  }

  // Start sync with SSE
  const startSync = useCallback(async () => {
    setStep('syncing')
    setProgress({
      phase: 'connecting',
      message: 'Starting sync...',
      ordersProcessed: 0,
      totalDays: 0,
      currentDay: 0,
      percentComplete: 0,
    })

    abortControllerRef.current = new AbortController()

    try {
      const params = new URLSearchParams({
        integrationId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      const response = await fetch(`/api/integrations/toast/sync/stream?${params}`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as SyncProgress
              setProgress(data)

              if (data.phase === 'complete') {
                setStep('complete')
                onSyncComplete?.()
              } else if (data.phase === 'error') {
                setStep('error')
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled
        return
      }

      console.error('Sync error:', error)
      setProgress({
        phase: 'error',
        message: 'Connection failed',
        ordersProcessed: 0,
        totalDays: 0,
        currentDay: 0,
        percentComplete: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      setStep('error')
    }
  }, [integrationId, startDate, endDate, onSyncComplete])

  // Cancel sync
  const cancelSync = () => {
    abortControllerRef.current?.abort()
    onOpenChange(false)
  }

  // Retry sync
  const retrySync = () => {
    setStep('config')
    setProgress(null)
  }

  // Get phase label
  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'connecting':
        return 'Connecting'
      case 'fetching':
        return 'Fetching Data'
      case 'processing':
        return 'Processing'
      case 'saving':
        return 'Saving'
      case 'complete':
        return 'Complete'
      case 'error':
        return 'Error'
      default:
        return 'Working'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'config' && 'Sync Toast Data'}
            {step === 'syncing' && 'Syncing...'}
            {step === 'complete' && 'Sync Complete'}
            {step === 'error' && 'Sync Failed'}
          </DialogTitle>
          <DialogDescription>
            {step === 'config' && (locationName ? `Sync data for ${locationName}` : 'Choose a date range to sync')}
            {step === 'syncing' && 'Please wait while we fetch and process your data'}
            {step === 'complete' && 'Your data has been successfully synced'}
            {step === 'error' && 'There was a problem syncing your data'}
          </DialogDescription>
        </DialogHeader>

        {/* Config Step */}
        {step === 'config' && (
          <div className="space-y-4 py-4">
            {/* Preset Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={presetRange} onValueChange={(v) => handlePresetChange(v as PresetRange)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">Current Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="12months">Last 12 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Pickers */}
            {presetRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MMM d, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'MMM d, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Date Range Summary */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Syncing from <span className="font-medium text-foreground">{format(startDate, 'MMM d, yyyy')}</span> to{' '}
                <span className="font-medium text-foreground">{format(endDate, 'MMM d, yyyy')}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Approximately {Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))} days of data
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={startSync}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Start Sync
              </Button>
            </div>
          </div>
        )}

        {/* Syncing Step */}
        {step === 'syncing' && progress && (
          <div className="space-y-6 py-4">
            {/* Progress Ring / Icon */}
            <div className="flex justify-center">
              <div className="relative h-20 w-20">
                <Loader2 className="h-20 w-20 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold">{progress.percentComplete}%</span>
                </div>
              </div>
            </div>

            {/* Phase Label */}
            <div className="text-center">
              <p className="text-sm font-medium text-primary">{getPhaseLabel(progress.phase)}</p>
              <p className="text-sm text-muted-foreground mt-1">{progress.message}</p>
            </div>

            {/* Progress Bar */}
            <Progress value={progress.percentComplete} className="h-2" />

            {/* Stats */}
            {progress.ordersProcessed > 0 && (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold tabular-nums">{progress.ordersProcessed.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Orders Processed</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold tabular-nums">
                    {progress.currentDay}/{progress.totalDays}
                  </p>
                  <p className="text-xs text-muted-foreground">Days Complete</p>
                </div>
              </div>
            )}

            {/* Cancel Button */}
            <div className="flex justify-center">
              <Button variant="outline" onClick={cancelSync}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && progress && (
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-medium">Sync Complete!</p>
              <p className="text-sm text-muted-foreground mt-1">{progress.message}</p>
            </div>

            {/* Final Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-2xl font-bold tabular-nums text-green-600">
                  {progress.ordersProcessed.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Orders Imported</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-2xl font-bold tabular-nums text-green-600">{progress.totalDays}</p>
                <p className="text-xs text-muted-foreground">Days Synced</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && progress && (
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-medium">Sync Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{progress.message}</p>
            </div>

            {progress.error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                <p className="font-medium">Error Details:</p>
                <p className="mt-1">{progress.error}</p>
              </div>
            )}

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={retrySync}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
