'use client'

import { cn } from '@/lib/utils'
import { Sparkline } from '@/components/charts/sparkline'
import { Card, CardContent } from '@/components/ui/card'
import type { HealthScore, HealthScoreBreakdown } from '@/lib/mock-data'

interface HealthScoreHeroProps {
  healthScore: HealthScore
  className?: string
}

function getHealthColor(score: number): string {
  if (score >= 100) return '#16A249'
  if (score >= 90) return '#82CB15'
  if (score >= 80) return 'hsl(var(--health-warning))'
  return 'hsl(var(--health-danger))'
}

function ProgressBar({ score }: { score: number }) {
  const cappedScore = Math.min(score, 100)
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${cappedScore}%`, backgroundColor: getHealthColor(score) }}
      />
      {score > 100 && (
        <div className="absolute inset-0 animate-pulse rounded-full" style={{ backgroundColor: 'rgba(22, 162, 73, 0.3)' }} />
      )}
    </div>
  )
}

function MetricRow({ metric }: { metric: HealthScoreBreakdown }) {
  return (
    <div className="grid grid-cols-12 items-center gap-4 py-2">
      <div className="col-span-4 text-sm font-medium">{metric.metric}</div>
      <div className="col-span-1 text-right text-sm text-muted-foreground">
        {metric.weight}%
      </div>
      <div className="col-span-4">
        <ProgressBar score={metric.score} />
      </div>
      <div
        className="col-span-2 text-right text-sm font-medium tabular-nums"
        style={{ color: getHealthColor(metric.score) }}
      >
        {metric.score.toFixed(1)}%
      </div>
      <div className="col-span-1 text-right text-xs text-muted-foreground tabular-nums">
        {metric.weightedScore.toFixed(1)}
      </div>
    </div>
  )
}

export function HealthScoreHero({ healthScore, className }: HealthScoreHeroProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6 md:p-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            {/* Score Display */}
            <div className="text-center md:text-left">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Overall Health Score
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className="text-6xl font-bold tabular-nums tracking-tight md:text-7xl"
                  style={{ color: getHealthColor(healthScore.overallScore) }}
                >
                  {healthScore.overallScore.toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Based on {healthScore.breakdown.length} weighted metrics
              </p>
            </div>

            {/* Trend Sparkline */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                12-Month Trend
              </p>
              <Sparkline
                data={healthScore.trend}
                width={160}
                height={48}
                color="hsl(var(--primary))"
                className="opacity-80"
              />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Low: {Math.min(...healthScore.trend).toFixed(1)}</span>
                <span>High: {Math.max(...healthScore.trend).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="border-t p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Score Breakdown
            </h3>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Metric</span>
              <span>Weight</span>
              <span>Progress</span>
              <span>Score</span>
              <span>Weighted</span>
            </div>
          </div>

          {/* Column Headers (visible on larger screens) */}
          <div className="hidden border-b pb-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4">
            <div className="col-span-4">Metric</div>
            <div className="col-span-1 text-right">Weight</div>
            <div className="col-span-4 text-center">Progress</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-1 text-right">Pts</div>
          </div>

          {/* Metrics List */}
          <div className="divide-y">
            {healthScore.breakdown.map((metric) => (
              <MetricRow key={metric.metric} metric={metric} />
            ))}
          </div>

          {/* EBITDA Adjustment */}
          {healthScore.ebitdaAdjustment !== 0 && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">EBITDA Adjustment</span>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    healthScore.ebitdaAdjustment > 0
                      ? 'text-health-excellent'
                      : 'text-health-danger'
                  )}
                >
                  {healthScore.ebitdaAdjustment > 0 ? '+' : ''}
                  {healthScore.ebitdaAdjustment}
                </span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-sm font-semibold">Total Weighted Score</span>
            <span className="text-lg font-bold tabular-nums">
              {healthScore.breakdown
                .reduce((sum, m) => sum + m.weightedScore, 0)
                .toFixed(2)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / 100
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
