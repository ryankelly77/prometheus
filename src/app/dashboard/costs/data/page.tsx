'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  RefreshCw,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Pencil,
  History,
  BarChart3,
  Table2,
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

// Types
type SyncStatus = 'synced' | 'manual' | 'error' | 'pending'

interface DailyCostsData {
  id: string
  date: string
  dayOfWeek: string
  totalSales: number
  laborCosts: number
  laborPercent: number
  foodCosts: number
  foodPercent: number
  primePercent: number
  status: SyncStatus
  syncedAt?: string
  manualReason?: string
}

// Pre-generated daily data for January 2025 that sums exactly to monthly totals
// Monthly totals: totalSales=507855, laborCosts=142199, foodCosts=162513
// Calculated: laborPercent=28.00%, foodPercent=32.00%, primePercent=59.98%
const mockDailyCostsData: DailyCostsData[] = [
  { id: 'daily-31', date: '2025-01-31', dayOfWeek: 'Fri', totalSales: 20956, laborCosts: 5868, foodCosts: 6706, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-31T06:00:00Z' },
  { id: 'daily-30', date: '2025-01-30', dayOfWeek: 'Thu', totalSales: 15062, laborCosts: 4217, foodCosts: 4820, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-31T06:00:00Z' },
  { id: 'daily-29', date: '2025-01-29', dayOfWeek: 'Wed', totalSales: 13425, laborCosts: 3759, foodCosts: 4296, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-30T06:00:00Z' },
  { id: 'daily-28', date: '2025-01-28', dayOfWeek: 'Tue', totalSales: 12442, laborCosts: 3484, foodCosts: 3981, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-29T06:00:00Z' },
  { id: 'daily-27', date: '2025-01-27', dayOfWeek: 'Mon', totalSales: 10805, laborCosts: 3025, foodCosts: 3458, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-28T06:00:00Z' },
  { id: 'daily-26', date: '2025-01-26', dayOfWeek: 'Sun', totalSales: 19482, laborCosts: 5455, foodCosts: 6234, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-27T06:00:00Z' },
  { id: 'daily-25', date: '2025-01-25', dayOfWeek: 'Sat', totalSales: 22429, laborCosts: 6280, foodCosts: 7177, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-26T06:00:00Z' },
  { id: 'daily-24', date: '2025-01-24', dayOfWeek: 'Fri', totalSales: 20956, laborCosts: 5868, foodCosts: 6706, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-25T06:00:00Z' },
  { id: 'daily-23', date: '2025-01-23', dayOfWeek: 'Thu', totalSales: 15062, laborCosts: 4217, foodCosts: 4820, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-24T06:00:00Z' },
  { id: 'daily-22', date: '2025-01-22', dayOfWeek: 'Wed', totalSales: 13425, laborCosts: 3759, foodCosts: 4296, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'manual', syncedAt: '2025-01-23T06:00:00Z', manualReason: 'Overtime adjustment for private event' },
  { id: 'daily-21', date: '2025-01-21', dayOfWeek: 'Tue', totalSales: 12442, laborCosts: 3484, foodCosts: 3981, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-22T06:00:00Z' },
  { id: 'daily-20', date: '2025-01-20', dayOfWeek: 'Mon', totalSales: 10805, laborCosts: 3025, foodCosts: 3458, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-21T06:00:00Z' },
  { id: 'daily-19', date: '2025-01-19', dayOfWeek: 'Sun', totalSales: 19482, laborCosts: 5455, foodCosts: 6234, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-20T06:00:00Z' },
  { id: 'daily-18', date: '2025-01-18', dayOfWeek: 'Sat', totalSales: 22429, laborCosts: 6280, foodCosts: 7177, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-19T06:00:00Z' },
  { id: 'daily-17', date: '2025-01-17', dayOfWeek: 'Fri', totalSales: 20956, laborCosts: 5868, foodCosts: 6706, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-18T06:00:00Z' },
  { id: 'daily-16', date: '2025-01-16', dayOfWeek: 'Thu', totalSales: 15062, laborCosts: 4217, foodCosts: 4820, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-17T06:00:00Z' },
  { id: 'daily-15', date: '2025-01-15', dayOfWeek: 'Wed', totalSales: 13425, laborCosts: 3759, foodCosts: 4296, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'manual', syncedAt: '2025-01-16T06:00:00Z', manualReason: 'Inventory adjustment' },
  { id: 'daily-14', date: '2025-01-14', dayOfWeek: 'Tue', totalSales: 12442, laborCosts: 3484, foodCosts: 3981, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-15T06:00:00Z' },
  { id: 'daily-13', date: '2025-01-13', dayOfWeek: 'Mon', totalSales: 10805, laborCosts: 3025, foodCosts: 3458, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-14T06:00:00Z' },
  { id: 'daily-12', date: '2025-01-12', dayOfWeek: 'Sun', totalSales: 19482, laborCosts: 5455, foodCosts: 6234, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-13T06:00:00Z' },
  { id: 'daily-11', date: '2025-01-11', dayOfWeek: 'Sat', totalSales: 22429, laborCosts: 6280, foodCosts: 7177, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-12T06:00:00Z' },
  { id: 'daily-10', date: '2025-01-10', dayOfWeek: 'Fri', totalSales: 20956, laborCosts: 5868, foodCosts: 6706, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-11T06:00:00Z' },
  { id: 'daily-09', date: '2025-01-09', dayOfWeek: 'Thu', totalSales: 15062, laborCosts: 4217, foodCosts: 4820, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-10T06:00:00Z' },
  { id: 'daily-08', date: '2025-01-08', dayOfWeek: 'Wed', totalSales: 13425, laborCosts: 3759, foodCosts: 4296, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-09T06:00:00Z' },
  { id: 'daily-07', date: '2025-01-07', dayOfWeek: 'Tue', totalSales: 12442, laborCosts: 3484, foodCosts: 3981, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-08T06:00:00Z' },
  { id: 'daily-06', date: '2025-01-06', dayOfWeek: 'Mon', totalSales: 10805, laborCosts: 3025, foodCosts: 3458, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-07T06:00:00Z' },
  { id: 'daily-05', date: '2025-01-05', dayOfWeek: 'Sun', totalSales: 19482, laborCosts: 5455, foodCosts: 6234, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-06T06:00:00Z' },
  { id: 'daily-04', date: '2025-01-04', dayOfWeek: 'Sat', totalSales: 22429, laborCosts: 6280, foodCosts: 7177, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-05T06:00:00Z' },
  { id: 'daily-03', date: '2025-01-03', dayOfWeek: 'Fri', totalSales: 20956, laborCosts: 5868, foodCosts: 6706, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-04T06:00:00Z' },
  { id: 'daily-02', date: '2025-01-02', dayOfWeek: 'Thu', totalSales: 15062, laborCosts: 4217, foodCosts: 4820, laborPercent: 28.00, foodPercent: 32.00, primePercent: 60.00, status: 'synced', syncedAt: '2025-01-03T06:00:00Z' },
  // Day 1 adjusted to make totals exact
  { id: 'daily-01', date: '2025-01-01', dayOfWeek: 'Wed', totalSales: 13433, laborCosts: 3763, foodCosts: 4299, laborPercent: 28.01, foodPercent: 32.01, primePercent: 60.02, status: 'synced', syncedAt: '2025-01-02T06:00:00Z' },
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

export default function CostsDataPage() {
  const router = useRouter()
  const { currentLocation, isAllLocations } = useLocation()
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [isResyncing, setIsResyncing] = useState(false)

  const handleTabChange = (value: string) => {
    if (value === 'charts') {
      router.push('/dashboard/costs')
    }
  }

  // Use mock data
  const dailyData = mockDailyCostsData

  // Calculate MTD totals
  const mtdTotals = useMemo(() => {
    const totals = dailyData.reduce(
      (acc, day) => ({
        totalSales: acc.totalSales + day.totalSales,
        laborCosts: acc.laborCosts + day.laborCosts,
        foodCosts: acc.foodCosts + day.foodCosts,
        syncedDays: acc.syncedDays + (day.status !== 'error' ? 1 : 0),
      }),
      { totalSales: 0, laborCosts: 0, foodCosts: 0, syncedDays: 0 }
    )

    return {
      ...totals,
      laborPercent: (totals.laborCosts / totals.totalSales) * 100,
      foodPercent: (totals.foodCosts / totals.totalSales) * 100,
      primePercent: ((totals.laborCosts + totals.foodCosts) / totals.totalSales) * 100,
    }
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
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsResyncing(false)

    toast.success(`Sync triggered for ${selectedRows.size} day${selectedRows.size > 1 ? 's' : ''}`)
    setSelectedRows(new Set())
  }

  const handleResyncMonth = async () => {
    setIsResyncing(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsResyncing(false)

    toast.success('Sync triggered for January 2025')
  }

  const handleResyncRow = async (id: string, date: string) => {
    toast.success(`Sync triggered for ${formatDate(date)}`)
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
          <h1 className="text-3xl font-bold tracking-tight">Costs</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Daily cost data across all locations'
              : `Daily cost data for ${currentLocation?.name}`}
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

        <div className="ml-auto text-sm text-muted-foreground">
          Last synced: Jan 25, 2025 6:00 AM from Toast
        </div>
      </div>

      {/* Data Table */}
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
              <TableHead>Labor Costs</TableHead>
              <TableHead>Labor %</TableHead>
              <TableHead>Food Costs</TableHead>
              <TableHead>Food %</TableHead>
              <TableHead>Prime %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyData.map((day) => (
              <TableRow
                key={day.id}
                data-state={selectedRows.has(day.id) ? 'selected' : undefined}
                className="group"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedRows.has(day.id)}
                    onCheckedChange={() => toggleRow(day.id)}
                    aria-label={`Select ${day.date}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {formatDate(day.date)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {day.status === 'error' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <>
                      {formatCurrency(day.laborCosts)}
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
                    `${day.laborPercent.toFixed(2)}%`
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {day.status === 'error' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatCurrency(day.foodCosts)
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {day.status === 'error' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    `${day.foodPercent.toFixed(2)}%`
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {day.status === 'error' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    `${day.primePercent.toFixed(2)}%`
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
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell></TableCell>
              <TableCell className="font-semibold">MTD Total</TableCell>
              <TableCell className="font-semibold tabular-nums">
                {formatCurrency(mtdTotals.laborCosts)}
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {mtdTotals.laborPercent.toFixed(2)}%
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {formatCurrency(mtdTotals.foodCosts)}
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {mtdTotals.foodPercent.toFixed(2)}%
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {mtdTotals.primePercent.toFixed(2)}%
              </TableCell>
              <TableCell className="text-muted-foreground">
                {mtdTotals.syncedDays}/{dailyData.length} days
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
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
              disabled={isResyncing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isResyncing ? 'animate-spin' : ''}`} />
              Re-sync Month
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
