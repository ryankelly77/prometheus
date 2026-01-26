'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type PeriodType = 'month' | 'quarter' | 'year'

interface PeriodSelectorProps {
  currentPeriod: string // e.g., "2025-01" for month, "2025-Q1" for quarter, "2025" for year
  periodType: PeriodType
  onPeriodChange: (period: string) => void
  onPeriodTypeChange: (type: PeriodType) => void
  className?: string
}

function formatPeriodDisplay(period: string, type: PeriodType): string {
  if (type === 'month') {
    const [year, month] = period.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (type === 'quarter') {
    return period.replace('-', ' ')
  }
  return period
}

function getPreviousPeriod(period: string, type: PeriodType): string {
  if (type === 'month') {
    const [year, month] = period.split('-').map(Number)
    const date = new Date(year, month - 2) // -2 because month is 1-indexed and we want previous
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  if (type === 'quarter') {
    const [year, q] = period.split('-Q')
    const quarter = parseInt(q)
    if (quarter === 1) {
      return `${parseInt(year) - 1}-Q4`
    }
    return `${year}-Q${quarter - 1}`
  }
  return String(parseInt(period) - 1)
}

function getNextPeriod(period: string, type: PeriodType): string {
  if (type === 'month') {
    const [year, month] = period.split('-').map(Number)
    const date = new Date(year, month) // month is already 0-indexed for next
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  if (type === 'quarter') {
    const [year, q] = period.split('-Q')
    const quarter = parseInt(q)
    if (quarter === 4) {
      return `${parseInt(year) + 1}-Q1`
    }
    return `${year}-Q${quarter + 1}`
  }
  return String(parseInt(period) + 1)
}

export function PeriodSelector({
  currentPeriod,
  periodType,
  onPeriodChange,
  onPeriodTypeChange,
  className,
}: PeriodSelectorProps) {
  const displayText = formatPeriodDisplay(currentPeriod, periodType)

  // Check if we can go forward (not beyond current date)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  const canGoNext = (() => {
    if (periodType === 'month') {
      const [year, month] = currentPeriod.split('-').map(Number)
      return year < currentYear || (year === currentYear && month < currentMonth)
    }
    if (periodType === 'quarter') {
      const [year, q] = currentPeriod.split('-Q')
      return parseInt(year) < currentYear ||
        (parseInt(year) === currentYear && parseInt(q) < currentQuarter)
    }
    return parseInt(currentPeriod) < currentYear
  })()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Period Type Toggle */}
      <Select value={periodType} onValueChange={(v) => onPeriodTypeChange(v as PeriodType)}>
        <SelectTrigger className="h-10 w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Month</SelectItem>
          <SelectItem value="quarter">Quarter</SelectItem>
          <SelectItem value="year">Year</SelectItem>
        </SelectContent>
      </Select>

      {/* Period Navigation */}
      <div className="flex h-10 items-center gap-1 rounded-md border bg-background px-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPeriodChange(getPreviousPeriod(currentPeriod, periodType))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex min-w-[140px] items-center justify-center gap-2 px-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{displayText}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPeriodChange(getNextPeriod(currentPeriod, periodType))}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
