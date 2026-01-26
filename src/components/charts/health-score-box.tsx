'use client'

import { cn } from '@/lib/utils'
import { Sparkline } from './sparkline'

interface HealthScoreBoxProps {
  percentage: number
  score: number
  maxScore: number
  trendData?: number[]
  className?: string
  hideScore?: boolean
}

function getHealthBgColor(percentage: number): string {
  if (percentage >= 100) return '#16A249'
  if (percentage >= 90) return '#82CB15'
  if (percentage >= 80) return 'hsl(var(--health-warning))'
  return 'hsl(var(--health-danger))'
}

function getHealthTextColor(percentage: number): string {
  if (percentage >= 80) return 'white'
  return 'white'
}

function getSparklineColor(percentage: number): string {
  if (percentage >= 100) return '#16A249'
  if (percentage >= 90) return '#82CB15'
  if (percentage >= 80) return 'hsl(var(--health-warning))'
  return 'hsl(var(--health-danger))'
}

export function HealthScoreBox({
  percentage,
  score,
  maxScore,
  trendData,
  className,
  hideScore = false,
}: HealthScoreBoxProps) {
  // Round percentage for display and use that for color so they match
  const displayPercentage = Math.round(percentage)

  return (
    <div
      className={cn(
        'mt-4 flex items-center gap-4 rounded-lg border bg-muted/30 p-3',
        className
      )}
    >
      <div className="text-sm font-medium text-muted-foreground">
        Health
        <br />
        Score
      </div>

      <div
        className="rounded-md px-3 py-1 text-lg font-bold tabular-nums"
        style={{ backgroundColor: getHealthBgColor(displayPercentage), color: getHealthTextColor(displayPercentage) }}
      >
        {displayPercentage}%
      </div>

      {trendData && trendData.length > 0 && (
        <div className="min-w-16 flex-1 px-1">
          <Sparkline data={trendData} color={getSparklineColor(displayPercentage)} height={28} />
        </div>
      )}

      {!hideScore && (
        <div className="text-right text-sm tabular-nums">
          <span className="font-semibold">{score.toFixed(1)}</span>
          <span className="text-muted-foreground"> / {maxScore}</span>
        </div>
      )}
    </div>
  )
}
