'use client'

import { useState, useMemo, useEffect, Fragment, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format, formatDistanceToNow } from 'date-fns'
import {
  RefreshCw,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Pencil,
  History,
  BarChart3,
  Table2,
  Loader2,
  ChevronDown,
  ChevronRight,
  UtensilsCrossed,
  Wine,
  Users,
  Receipt,
} from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import { formatCurrency } from '@/lib/mock-data'
import { PeriodSelector } from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

interface SyncProgress {
  phase: 'connecting' | 'fetching' | 'processing' | 'saving' | 'complete' | 'error'
  message: string
  ordersProcessed: number
  totalDays: number
  currentDay: number
  percentComplete: number
  error?: string
}

// Types
type SyncStatus = 'synced' | 'manual' | 'error' | 'pending'

interface DaypartMetric {
  id: string
  date: string
  daypart: string
  totalSales: number
  foodSales: number
  alcoholSales: number
  beerSales: number
  wineSales: number
  liquorSales: number
  covers: number
  checkCount: number
}

interface DailySalesData {
  id: string
  date: string
  dayOfWeek: string
  totalSales: number
  foodSales: number
  alcoholSales: number
  beerSales: number
  wineSales: number
  orderCount: number
  status: SyncStatus
  syncedAt?: string
  manualReason?: string
  dayparts?: DaypartMetric[]
}

// Format daypart enum to readable name
function formatDaypart(daypart: string): string {
  const names: Record<string, string> = {
    BREAKFAST: 'Breakfast',
    BRUNCH: 'Brunch',
    LUNCH: 'Lunch',
    AFTERNOON: 'Afternoon',
    DINNER: 'Dinner',
    LATE_NIGHT: 'Late Night',
  }
  return names[daypart] || daypart
}

// Pre-generated daily data for January 2025 that sums exactly to monthly totals
// Monthly totals: totalSales=507855, foodSales=301156, alcoholSales=52311, beerSales=14203, wineSales=41892
// Verified sums:
// - Sat(4): 22429×4=89716, 13301×4=53204, 2309×4=9236, 627×4=2508, 1849×4=7396
// - Fri(5): 20956×5=104780, 12426×5=62130, 2157×5=10785, 586×5=2930, 1727×5=8635
// - Sun(4): 19482×4=77928, 11553×4=46212, 2005×4=8020, 545×4=2180, 1605×4=6420
// - Thu(5): 15062×5=75310, 8932×5=44660, 1550×5=7750, 421×5=2105, 1241×5=6205
// - Wed(4): 13425×4=53700, 7961×4=31844, 1382×4=5528, 375×4=1500, 1106×4=4424
// - Tue(4): 12442×4=49768, 7378×4=29512, 1280×4=5120, 348×4=1392, 1024×4=4096
// - Mon(4): 10805×4=43220, 6407×4=25628, 1112×4=4448, 302×4=1208, 890×4=3560
// - Day1(Wed): 13433, 7966, 1424, 380, 1156
// Totals: 507855, 301156, 52311, 14203, 41892 ✓
const mockDailyData: DailySalesData[] = [
  { id: 'daily-31', date: '2025-01-31', dayOfWeek: 'Fri', totalSales: 20956, foodSales: 12426, alcoholSales: 2157, beerSales: 586, wineSales: 1727, orderCount: 145, status: 'synced', syncedAt: '2025-01-31T06:00:00Z' },
  { id: 'daily-30', date: '2025-01-30', dayOfWeek: 'Thu', totalSales: 15062, foodSales: 8932, alcoholSales: 1550, beerSales: 421, wineSales: 1241, orderCount: 112, status: 'synced', syncedAt: '2025-01-31T06:00:00Z' },
  { id: 'daily-29', date: '2025-01-29', dayOfWeek: 'Wed', totalSales: 13425, foodSales: 7961, alcoholSales: 1382, beerSales: 375, wineSales: 1106, orderCount: 98, status: 'synced', syncedAt: '2025-01-30T06:00:00Z' },
  { id: 'daily-28', date: '2025-01-28', dayOfWeek: 'Tue', totalSales: 12442, foodSales: 7378, alcoholSales: 1280, beerSales: 348, wineSales: 1024, orderCount: 91, status: 'synced', syncedAt: '2025-01-29T06:00:00Z' },
  { id: 'daily-27', date: '2025-01-27', dayOfWeek: 'Mon', totalSales: 10805, foodSales: 6407, alcoholSales: 1112, beerSales: 302, wineSales: 890, orderCount: 78, status: 'synced', syncedAt: '2025-01-28T06:00:00Z' },
  { id: 'daily-26', date: '2025-01-26', dayOfWeek: 'Sun', totalSales: 19482, foodSales: 11553, alcoholSales: 2005, beerSales: 545, wineSales: 1605, orderCount: 138, status: 'synced', syncedAt: '2025-01-27T06:00:00Z' },
  { id: 'daily-25', date: '2025-01-25', dayOfWeek: 'Sat', totalSales: 22429, foodSales: 13301, alcoholSales: 2309, beerSales: 627, wineSales: 1849, orderCount: 162, status: 'synced', syncedAt: '2025-01-26T06:00:00Z' },
  { id: 'daily-24', date: '2025-01-24', dayOfWeek: 'Fri', totalSales: 20956, foodSales: 12426, alcoholSales: 2157, beerSales: 586, wineSales: 1727, orderCount: 145, status: 'synced', syncedAt: '2025-01-25T06:00:00Z' },
  { id: 'daily-23', date: '2025-01-23', dayOfWeek: 'Thu', totalSales: 15062, foodSales: 8932, alcoholSales: 1550, beerSales: 421, wineSales: 1241, orderCount: 112, status: 'synced', syncedAt: '2025-01-24T06:00:00Z' },
  { id: 'daily-22', date: '2025-01-22', dayOfWeek: 'Wed', totalSales: 13425, foodSales: 7961, alcoholSales: 1382, beerSales: 375, wineSales: 1106, orderCount: 98, status: 'manual', syncedAt: '2025-01-23T06:00:00Z', manualReason: 'Catering order was missing from Toast' },
  { id: 'daily-21', date: '2025-01-21', dayOfWeek: 'Tue', totalSales: 12442, foodSales: 7378, alcoholSales: 1280, beerSales: 348, wineSales: 1024, orderCount: 91, status: 'synced', syncedAt: '2025-01-22T06:00:00Z' },
  { id: 'daily-20', date: '2025-01-20', dayOfWeek: 'Mon', totalSales: 10805, foodSales: 6407, alcoholSales: 1112, beerSales: 302, wineSales: 890, orderCount: 78, status: 'synced', syncedAt: '2025-01-21T06:00:00Z' },
  { id: 'daily-19', date: '2025-01-19', dayOfWeek: 'Sun', totalSales: 19482, foodSales: 11553, alcoholSales: 2005, beerSales: 545, wineSales: 1605, orderCount: 138, status: 'synced', syncedAt: '2025-01-20T06:00:00Z' },
  { id: 'daily-18', date: '2025-01-18', dayOfWeek: 'Sat', totalSales: 22429, foodSales: 13301, alcoholSales: 2309, beerSales: 627, wineSales: 1849, orderCount: 162, status: 'synced', syncedAt: '2025-01-19T06:00:00Z' },
  { id: 'daily-17', date: '2025-01-17', dayOfWeek: 'Fri', totalSales: 20956, foodSales: 12426, alcoholSales: 2157, beerSales: 586, wineSales: 1727, orderCount: 145, status: 'synced', syncedAt: '2025-01-18T06:00:00Z' },
  { id: 'daily-16', date: '2025-01-16', dayOfWeek: 'Thu', totalSales: 15062, foodSales: 8932, alcoholSales: 1550, beerSales: 421, wineSales: 1241, orderCount: 112, status: 'synced', syncedAt: '2025-01-17T06:00:00Z' },
  { id: 'daily-15', date: '2025-01-15', dayOfWeek: 'Wed', totalSales: 13425, foodSales: 7961, alcoholSales: 1382, beerSales: 375, wineSales: 1106, orderCount: 98, status: 'manual', syncedAt: '2025-01-16T06:00:00Z', manualReason: 'Gift card adjustment' },
  { id: 'daily-14', date: '2025-01-14', dayOfWeek: 'Tue', totalSales: 12442, foodSales: 7378, alcoholSales: 1280, beerSales: 348, wineSales: 1024, orderCount: 91, status: 'synced', syncedAt: '2025-01-15T06:00:00Z' },
  { id: 'daily-13', date: '2025-01-13', dayOfWeek: 'Mon', totalSales: 10805, foodSales: 6407, alcoholSales: 1112, beerSales: 302, wineSales: 890, orderCount: 78, status: 'synced', syncedAt: '2025-01-14T06:00:00Z' },
  { id: 'daily-12', date: '2025-01-12', dayOfWeek: 'Sun', totalSales: 19482, foodSales: 11553, alcoholSales: 2005, beerSales: 545, wineSales: 1605, orderCount: 138, status: 'synced', syncedAt: '2025-01-13T06:00:00Z' },
  { id: 'daily-11', date: '2025-01-11', dayOfWeek: 'Sat', totalSales: 22429, foodSales: 13301, alcoholSales: 2309, beerSales: 627, wineSales: 1849, orderCount: 162, status: 'synced', syncedAt: '2025-01-12T06:00:00Z' },
  { id: 'daily-10', date: '2025-01-10', dayOfWeek: 'Fri', totalSales: 20956, foodSales: 12426, alcoholSales: 2157, beerSales: 586, wineSales: 1727, orderCount: 145, status: 'synced', syncedAt: '2025-01-11T06:00:00Z' },
  { id: 'daily-09', date: '2025-01-09', dayOfWeek: 'Thu', totalSales: 15062, foodSales: 8932, alcoholSales: 1550, beerSales: 421, wineSales: 1241, orderCount: 112, status: 'synced', syncedAt: '2025-01-10T06:00:00Z' },
  { id: 'daily-08', date: '2025-01-08', dayOfWeek: 'Wed', totalSales: 13425, foodSales: 7961, alcoholSales: 1382, beerSales: 375, wineSales: 1106, orderCount: 98, status: 'synced', syncedAt: '2025-01-09T06:00:00Z' },
  { id: 'daily-07', date: '2025-01-07', dayOfWeek: 'Tue', totalSales: 12442, foodSales: 7378, alcoholSales: 1280, beerSales: 348, wineSales: 1024, orderCount: 91, status: 'synced', syncedAt: '2025-01-08T06:00:00Z' },
  { id: 'daily-06', date: '2025-01-06', dayOfWeek: 'Mon', totalSales: 10805, foodSales: 6407, alcoholSales: 1112, beerSales: 302, wineSales: 890, orderCount: 78, status: 'synced', syncedAt: '2025-01-07T06:00:00Z' },
  { id: 'daily-05', date: '2025-01-05', dayOfWeek: 'Sun', totalSales: 19482, foodSales: 11553, alcoholSales: 2005, beerSales: 545, wineSales: 1605, orderCount: 138, status: 'synced', syncedAt: '2025-01-06T06:00:00Z' },
  { id: 'daily-04', date: '2025-01-04', dayOfWeek: 'Sat', totalSales: 22429, foodSales: 13301, alcoholSales: 2309, beerSales: 627, wineSales: 1849, orderCount: 162, status: 'synced', syncedAt: '2025-01-05T06:00:00Z' },
  { id: 'daily-03', date: '2025-01-03', dayOfWeek: 'Fri', totalSales: 20956, foodSales: 12426, alcoholSales: 2157, beerSales: 586, wineSales: 1727, orderCount: 145, status: 'synced', syncedAt: '2025-01-04T06:00:00Z' },
  { id: 'daily-02', date: '2025-01-02', dayOfWeek: 'Thu', totalSales: 15062, foodSales: 8932, alcoholSales: 1550, beerSales: 421, wineSales: 1241, orderCount: 112, status: 'synced', syncedAt: '2025-01-03T06:00:00Z' },
  // Day 1 adjusted to make totals exact: 507855, 301156, 52311, 14203, 41892
  { id: 'daily-01', date: '2025-01-01', dayOfWeek: 'Wed', totalSales: 13433, foodSales: 7966, alcoholSales: 1424, beerSales: 380, wineSales: 1156, orderCount: 98, status: 'synced', syncedAt: '2025-01-02T06:00:00Z' },
]

// Status badge component
function StatusBadge({ status }: { status: SyncStatus }) {
  const config = {
    synced: {
      icon: CheckCircle2,
      label: 'Synced',
      className: 'text-health-excellent',
    },
    manual: {
      icon: Pencil,
      label: 'Manual',
      className: 'text-health-warning',
    },
    error: {
      icon: XCircle,
      label: 'Error',
      className: 'text-health-danger',
    },
    pending: {
      icon: RefreshCw,
      label: 'Pending',
      className: 'text-muted-foreground',
    },
  }

  const { icon: Icon, label, className } = config[status]

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

// Format date for display (parse as local date to avoid timezone issues)
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Get current month in YYYY-MM format
function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export default function SalesDataPage() {
  const router = useRouter()
  const { currentLocation, isAllLocations, locations } = useLocation()
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentPeriod)
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [isResyncing, setIsResyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [realData, setRealData] = useState<DailySalesData[]>([])
  const [hasRealData, setHasRealData] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [integrationId, setIntegrationId] = useState<string | null>(null)
  const [monthLastSyncAt, setMonthLastSyncAt] = useState<string | null>(null) // Per-month sync time
  const [refreshKey, setRefreshKey] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Toggle expanded row
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // Fetch real data from API
  useEffect(() => {
    async function fetchSalesData() {
      try {
        setIsLoading(true)
        const params = new URLSearchParams()

        if (currentLocation?.id) {
          params.set('locationId', currentLocation.id)
        }

        // Parse period to get date range
        const [year, month] = currentPeriod.split('-').map(Number)
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0) // Last day of month
        params.set('startDate', startDate.toISOString().slice(0, 10))
        params.set('endDate', endDate.toISOString().slice(0, 10))

        const response = await fetch(`/api/sales/daily?${params.toString()}`)
        const result = await response.json()

        // Capture month-specific last sync time
        if (result.lastSyncedAt) {
          setMonthLastSyncAt(result.lastSyncedAt)
        } else {
          setMonthLastSyncAt(null)
        }

        if (result.data && result.data.length > 0) {
          // Group daypart metrics by date
          const daypartsByDate: Record<string, DaypartMetric[]> = {}
          if (result.daypartMetrics) {
            for (const dp of result.daypartMetrics) {
              const dateStr = typeof dp.date === 'string'
                ? dp.date.slice(0, 10)
                : new Date(dp.date).toISOString().slice(0, 10)
              if (!daypartsByDate[dateStr]) {
                daypartsByDate[dateStr] = []
              }
              daypartsByDate[dateStr].push({
                id: dp.id,
                date: dateStr,
                daypart: dp.daypart,
                totalSales: Number(dp.totalSales) || 0,
                foodSales: Number(dp.foodSales) || 0,
                alcoholSales: Number(dp.alcoholSales) || 0,
                beerSales: Number(dp.beerSales) || 0,
                wineSales: Number(dp.wineSales) || 0,
                liquorSales: Number(dp.liquorSales) || 0,
                covers: Number(dp.covers) || 0,
                checkCount: Number(dp.checkCount) || 0,
              })
            }
          }

          // Transform API data to match our interface
          const transformedData: DailySalesData[] = result.data.map((item: {
            id: string
            date: string
            dayOfWeek: string
            netSales: number
            grossSales: number
            transactionCount?: number
            status: SyncStatus
            syncedAt?: string
          }) => {
            const dayparts = daypartsByDate[item.date] || []
            // Sum up category sales from daypart metrics
            const foodSales = dayparts.reduce((sum, dp) => sum + dp.foodSales, 0)
            const alcoholSales = dayparts.reduce((sum, dp) => sum + dp.alcoholSales, 0)
            const beerSales = dayparts.reduce((sum, dp) => sum + dp.beerSales, 0)
            const wineSales = dayparts.reduce((sum, dp) => sum + dp.wineSales, 0)
            // Get order count from transactionCount (API) or sum checkCount from dayparts
            const orderCount = item.transactionCount || dayparts.reduce((sum, dp) => sum + dp.checkCount, 0)

            return {
              id: item.id,
              date: item.date,
              dayOfWeek: item.dayOfWeek,
              totalSales: item.netSales || item.grossSales,
              foodSales,
              alcoholSales,
              beerSales,
              wineSales,
              orderCount,
              status: item.status || 'synced',
              syncedAt: item.syncedAt,
              dayparts,
            }
          })
          setRealData(transformedData)
          setHasRealData(true)
        } else {
          setHasRealData(false)
        }
      } catch (error) {
        console.error('Failed to fetch sales data:', error)
        setHasRealData(false)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSalesData()
  }, [currentLocation?.id, currentPeriod, refreshKey])

  const handleTabChange = (value: string) => {
    if (value === 'charts') {
      router.push('/dashboard/sales')
    }
  }

  // Fetch integration ID for current location (or first location if "All" selected)
  useEffect(() => {
    async function fetchIntegrationStatus() {
      // Use currentLocation if set, otherwise use first location from context
      const locationToUse = currentLocation ?? locations[0]
      if (!locationToUse?.id) return

      try {
        const response = await fetch(`/api/integrations/toast/status?locationId=${locationToUse.id}`)
        const data = await response.json()
        if (data.integrationId) {
          setIntegrationId(data.integrationId)
        }
      } catch (error) {
        console.error('Failed to fetch integration status:', error)
      }
    }
    fetchIntegrationStatus()
  }, [currentLocation, locations])

  // Use real data if available. Only fall back to mock if NO integration is connected (demo mode)
  // If integration exists but no data for this period, show empty state instead of mock
  const dailyData = hasRealData ? realData : (integrationId ? [] : mockDailyData)

  // Calculate MTD totals
  const mtdTotals = useMemo(() => {
    return dailyData.reduce(
      (acc, day) => ({
        totalSales: acc.totalSales + day.totalSales,
        foodSales: acc.foodSales + day.foodSales,
        alcoholSales: acc.alcoholSales + day.alcoholSales,
        beerSales: acc.beerSales + day.beerSales,
        wineSales: acc.wineSales + day.wineSales,
        orderCount: acc.orderCount + (day.orderCount || 0),
        syncedDays: acc.syncedDays + (day.status !== 'error' ? 1 : 0),
      }),
      { totalSales: 0, foodSales: 0, alcoholSales: 0, beerSales: 0, wineSales: 0, orderCount: 0, syncedDays: 0 }
    )
  }, [dailyData])

  // Selection handlers
  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const toggleAll = () => {
    if (selectedRows.size === dailyData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(dailyData.map(d => d.id)))
    }
  }

  // Re-sync handlers
  const handleResyncSelected = async () => {
    if (selectedRows.size === 0) {
      toast.error('No rows selected')
      return
    }

    setIsResyncing(true)
    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsResyncing(false)

    toast.success(`Sync triggered for ${selectedRows.size} day${selectedRows.size > 1 ? 's' : ''}`)
    setSelectedRows(new Set())
  }

  const handleResyncMonth = useCallback(async () => {
    if (!integrationId) {
      toast.error('No Toast integration found. Please connect Toast first.')
      return
    }

    setIsResyncing(true)
    setSyncProgress({
      phase: 'connecting',
      message: 'Starting sync...',
      ordersProcessed: 0,
      totalDays: 0,
      currentDay: 0,
      percentComplete: 0,
    })

    abortControllerRef.current = new AbortController()

    try {
      // Calculate date range for current period
      const [year, month] = currentPeriod.split('-').map(Number)
      const startDate = startOfMonth(new Date(year, month - 1))
      const endDate = endOfMonth(new Date(year, month - 1))

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
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as SyncProgress
              setSyncProgress(data)

              if (data.phase === 'complete') {
                toast.success(`Sync complete! Imported ${data.ordersProcessed} orders for ${format(startDate, 'MMMM yyyy')}`)
                // Refetch data after short delay
                setTimeout(() => {
                  setSyncProgress(null)
                  setIsResyncing(false)
                  setRefreshKey(prev => prev + 1) // Trigger data refetch
                }, 1500)
              } else if (data.phase === 'error') {
                toast.error(data.error || 'Sync failed')
                setSyncProgress(null)
                setIsResyncing(false)
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('Sync cancelled')
      } else {
        console.error('Sync error:', error)
        toast.error(error instanceof Error ? error.message : 'Sync failed')
      }
      setSyncProgress(null)
      setIsResyncing(false)
    }
  }, [integrationId, currentPeriod])

  const handleResyncRow = async (id: string, date: string) => {
    if (!integrationId) {
      toast.error('No integration connected')
      return
    }

    setIsResyncing(true)

    try {
      // Parse the date and sync just that one day
      const targetDate = new Date(date)
      const startDate = startOfDay(targetDate)
      const endDate = endOfDay(targetDate)

      const params = new URLSearchParams({
        integrationId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      toast.info(`Syncing ${formatDate(date)}...`)

      const response = await fetch(`/api/integrations/toast/sync/stream?${params}`)

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
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as SyncProgress
              if (data.phase === 'complete') {
                toast.success(`Synced ${formatDate(date)}: ${data.ordersProcessed} orders`)
                setRefreshKey(prev => prev + 1)
              } else if (data.phase === 'error') {
                toast.error(data.error || 'Sync failed')
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setIsResyncing(false)
    }
  }

  const handleEditRow = (id: string) => {
    toast.info('Edit functionality coming soon')
  }

  const handleViewHistory = (id: string) => {
    toast.info('Sync history coming soon')
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Daily sales data across all locations'
              : `Daily sales data for ${currentLocation?.name}`}
          </p>
        </div>
        <PeriodSelector
          currentPeriod={currentPeriod}
          periodType={periodType}
          onPeriodChange={setCurrentPeriod}
          onPeriodTypeChange={setPeriodType}
        />
      </div>

      {/* View Tabs */}
      <Tabs value="data" onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        <Select defaultValue="all">
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="synced">Synced</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="error">Errors</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          {hasRealData ? (
            <>
              {monthLastSyncAt && (
                <span>
                  Last synced: {format(new Date(monthLastSyncAt), 'MMM d, yyyy')} at{' '}
                  {format(new Date(monthLastSyncAt), 'h:mm a')}
                </span>
              )}
              <span className="text-green-600 font-medium">Live data from Toast</span>
            </>
          ) : integrationId ? (
            <>
              <span className="text-amber-600">No data for this period</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResyncMonth}
                disabled={isResyncing}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isResyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </>
          ) : (
            <span>Sample data — <a href="/dashboard/settings?tab=integrations" className="text-primary hover:underline">Connect Toast</a> to see live data</span>
          )}
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading sales data...</span>
        </div>
      ) : dailyData.length === 0 && integrationId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/30">
          <RefreshCw className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No data for this period</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            There&apos;s no synced sales data for the selected month. Sync now to import data from Toast.
          </p>
          <Button onClick={handleResyncMonth} disabled={isResyncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isResyncing ? 'animate-spin' : ''}`} />
            Sync This Month
          </Button>
        </div>
      ) : (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedRows.size === dailyData.length}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total Sales</TableHead>
              <TableHead>Food</TableHead>
              <TableHead>Alcohol</TableHead>
              <TableHead>Beer</TableHead>
              <TableHead>Wine</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyData.map((day) => {
              const hasDayparts = day.dayparts && day.dayparts.length > 0
              const isExpanded = expandedRows.has(day.id)

              return (
                <Fragment key={day.id}>
                  <TableRow
                    data-state={selectedRows.has(day.id) ? 'selected' : undefined}
                    className="group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasDayparts && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleExpanded(day.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Checkbox
                          checked={selectedRows.has(day.id)}
                          onCheckedChange={() => toggleRow(day.id)}
                          aria-label={`Select ${day.date}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatDate(day.date)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {day.status === 'error' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          {formatCurrency(day.totalSales)}
                          {day.status === 'manual' && (
                            <span className="ml-1 text-health-warning" title={day.manualReason}>*</span>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {day.status === 'error' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatCurrency(day.foodSales)
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {day.status === 'error' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatCurrency(day.alcoholSales)
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {day.status === 'error' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatCurrency(day.beerSales)
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {day.status === 'error' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatCurrency(day.wineSales)
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {day.status === 'error' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        day.orderCount?.toLocaleString() || '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={day.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResyncRow(day.id, day.date)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Re-sync this day
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditRow(day.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit values
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewHistory(day.id)}>
                            <History className="mr-2 h-4 w-4" />
                            View history
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {/* Expanded daypart details row */}
                  {hasDayparts && isExpanded && (
                    <TableRow key={`${day.id}-dayparts`} className="bg-muted/30 hover:bg-muted/40">
                      <TableCell colSpan={10} className="py-3">
                        <div className="ml-8 space-y-2">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Daypart Breakdown
                          </div>
                          <div className="grid gap-2">
                            {day.dayparts!.map((dp) => (
                              <div
                                key={dp.id}
                                className="flex items-center gap-6 rounded-md bg-background/60 px-4 py-2 text-sm"
                              >
                                <div className="w-24 font-medium text-foreground">
                                  {formatDaypart(dp.daypart)}
                                </div>
                                <div className="flex items-center gap-1.5 min-w-[100px]">
                                  <span className="text-muted-foreground">Total:</span>
                                  <span className="tabular-nums font-medium">{formatCurrency(dp.totalSales)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-[90px]">
                                  <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="tabular-nums">{formatCurrency(dp.foodSales)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-[90px]">
                                  <Wine className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="tabular-nums">{formatCurrency(dp.alcoholSales)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-[70px]">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="tabular-nums">{dp.covers}</span>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-[70px]">
                                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="tabular-nums">{dp.checkCount}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell></TableCell>
              <TableCell className="font-semibold">MTD Total</TableCell>
              <TableCell className="font-semibold tabular-nums">
                {formatCurrency(mtdTotals.totalSales)}
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {formatCurrency(mtdTotals.foodSales)}
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {formatCurrency(mtdTotals.alcoholSales)}
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {formatCurrency(mtdTotals.beerSales)}
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {formatCurrency(mtdTotals.wineSales)}
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {mtdTotals.orderCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {mtdTotals.syncedDays}/{dailyData.length} days
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      )}

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-6 py-4">
          {/* Sync Progress */}
          {syncProgress && syncProgress.phase !== 'complete' && syncProgress.phase !== 'error' && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{syncProgress.message}</span>
                <span className="font-medium tabular-nums">{syncProgress.percentComplete}%</span>
              </div>
              <Progress value={syncProgress.percentComplete} className="h-2" />
              {syncProgress.ordersProcessed > 0 && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{syncProgress.ordersProcessed.toLocaleString()} orders processed</span>
                  {syncProgress.totalDays > 0 && (
                    <span>{syncProgress.currentDay}/{syncProgress.totalDays} days</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedRows.size > 0 ? (
                <span className="font-medium text-foreground">{selectedRows.size} selected</span>
              ) : (
                <span>No rows selected</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleResyncSelected}
                disabled={selectedRows.size === 0 || isResyncing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isResyncing ? 'animate-spin' : ''}`} />
                Re-sync Selected
              </Button>
              <Button
                onClick={handleResyncMonth}
                disabled={isResyncing || !integrationId}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isResyncing ? 'animate-spin' : ''}`} />
                Re-sync Month
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
