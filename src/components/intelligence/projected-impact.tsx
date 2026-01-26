'use client'

import { TrendingUp, ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfidenceBadge } from './confidence-badge'
import { cn } from '@/lib/utils'

interface ProjectedImpactProps {
  impact: {
    currentMonthlySales: number
    projectedRecovery: number
    projectedMonthlySales: number
    timelineWeeks: number
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function ProjectedImpact({ impact }: ProjectedImpactProps) {
  const recoveryPercent = ((impact.projectedRecovery / impact.currentMonthlySales) * 100).toFixed(1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-health-excellent" />
            Projected Impact
          </CardTitle>
          <ConfidenceBadge confidence={impact.confidence} size="sm" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          {/* Current */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Monthly</p>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrency(impact.currentMonthlySales)}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-health-excellent font-medium">
              +{formatCurrency(impact.projectedRecovery)}
            </span>
          </div>

          {/* Projected */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Projected Monthly</p>
            <p className="text-xl font-bold tabular-nums text-health-excellent">
              {formatCurrency(impact.projectedMonthlySales)}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Expected in {impact.timelineWeeks} weeks if actions are completed
          </span>
        </div>

        {/* Progress Bar Visualization */}
        <div className="mt-4">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-health-excellent rounded-full transition-all"
              style={{ width: `${Math.min(100, parseFloat(recoveryPercent) + 50)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Current</span>
            <span>+{recoveryPercent}% recovery</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
