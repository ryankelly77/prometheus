'use client'

import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Sparkline } from '@/components/charts/sparkline'
import type { HealthScore, HealthScoreBreakdown } from '@/lib/mock-data'

interface HealthScorePanelProps {
  healthScore: HealthScore
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Define section groupings (weights add to 100)
const sections = [
  {
    name: 'Sales Performance',
    maxPoints: 50,
    metrics: ['Total Sales', 'Food Sales', 'Alcohol Sales', 'Wine Sales', 'Beer Sales', 'RevPASH'],
  },
  {
    name: 'Cost Management',
    maxPoints: 35,
    metrics: ['Prime Cost', 'Labor Costs', 'Food Costs', 'Beverage Costs'],
  },
  {
    name: 'Customer Insights',
    maxPoints: 10,
    metrics: ['Customer Loyalty', 'Reviews', 'PPA'],
  },
  {
    name: 'Marketing & Visibility',
    maxPoints: 5,
    metrics: ['Website Visibility', 'PR Mentions'],
  },
]

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
    <div className="space-y-1.5 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{metric.metric}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{metric.weight}%</span>
          <span
            className="min-w-[52px] text-right text-sm font-semibold tabular-nums"
            style={{ color: getHealthColor(metric.score) }}
          >
            {metric.score.toFixed(1)}%
          </span>
        </div>
      </div>
      <ProgressBar score={metric.score} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          Actual: {typeof metric.actual === 'number' && metric.actual > 1000
            ? `$${metric.actual.toLocaleString()}`
            : metric.actual}
        </span>
        <span>
          Target: {typeof metric.target === 'number' && metric.target > 1000
            ? `$${metric.target.toLocaleString()}`
            : metric.target}
        </span>
        <span className="font-medium">+{metric.weightedScore.toFixed(2)} pts</span>
      </div>
    </div>
  )
}

function SectionGroup({
  name,
  metrics,
  maxPoints,
  breakdown
}: {
  name: string
  metrics: string[]
  maxPoints: number
  breakdown: HealthScoreBreakdown[]
}) {
  const sectionMetrics = metrics
    .map(m => breakdown.find(b => b.metric === m))
    .filter((m): m is HealthScoreBreakdown => m !== undefined)

  if (sectionMetrics.length === 0) return null

  const sectionTotal = sectionMetrics.reduce((sum, m) => sum + m.weightedScore, 0)

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {name}
        </h4>
        <span className="text-xs font-medium text-muted-foreground">
          {sectionTotal.toFixed(1)} / {maxPoints} pts
        </span>
      </div>
      <div className="rounded-lg border bg-card">
        <div className="divide-y px-3">
          {sectionMetrics.map((metric) => (
            <MetricRow key={metric.metric} metric={metric} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function HealthScorePanel({
  healthScore,
  open,
  onOpenChange,
}: HealthScorePanelProps) {
  const totalWeightedScore = healthScore.breakdown.reduce(
    (sum, m) => sum + m.weightedScore,
    0
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-4 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Health Score Details</SheetTitle>
          </div>

          {/* Score Hero */}
          <div className="rounded-xl bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Overall Score
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="text-5xl font-bold tabular-nums tracking-tight"
                style={{ color: getHealthColor(healthScore.overallScore) }}
              >
                {healthScore.overallScore.toFixed(2)}
              </span>
              <span className="text-lg text-muted-foreground">/ 100</span>
            </div>

            {/* Trend */}
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">12-Month Trend</p>
              <Sparkline
                data={healthScore.trend}
                height={40}
                color="hsl(var(--primary))"
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Low: {Math.min(...healthScore.trend).toFixed(1)}</span>
                <span>High: {Math.max(...healthScore.trend).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Metrics Breakdown by Section */}
        <div>
          {sections.map((section) => (
            <SectionGroup
              key={section.name}
              name={section.name}
              metrics={section.metrics}
              maxPoints={section.maxPoints}
              breakdown={healthScore.breakdown}
            />
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
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <span className="text-sm font-semibold">Total Weighted Score</span>
          <span className="text-xl font-bold tabular-nums">
            {totalWeightedScore.toFixed(2)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              / 100
            </span>
          </span>
        </div>

        {/* Adjust Weights Button */}
        <div className="mt-6 pb-4">
          <Button variant="outline" className="w-full gap-2" asChild>
            <Link href="/dashboard/health-score">
              <Settings2 className="h-4 w-4" />
              Adjust Weights
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
