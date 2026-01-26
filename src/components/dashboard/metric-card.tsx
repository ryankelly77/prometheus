'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkline } from '@/components/charts/sparkline'
import { HealthScoreBox } from '@/components/charts/health-score-box'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Percent,
  Target,
  Newspaper,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Percent,
  Target,
  Newspaper,
}

interface MetricCardProps {
  title: string
  value: string
  change?: {
    value: string
    type: 'positive' | 'negative' | 'neutral'
  }
  icon?: string
  sparklineData?: number[]
  healthScore?: {
    percentage: number
    score: number
    maxScore: number
    trendData?: number[]
  }
  info?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  sparklineData,
  healthScore,
  info,
  className,
}: MetricCardProps) {
  const IconComponent = icon ? iconMap[icon] : null

  return (
    <Card
      className={cn(
        'group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
    >
      <CardContent className="p-5 overflow-hidden">
        {/* Header with icon and title */}
        <div className="flex items-start gap-3 min-w-0">
          {IconComponent && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconComponent className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl truncate">{value}</p>
          </div>
        </div>

        {/* Change indicator */}
        {change && (
          <div className="mt-3 flex items-center gap-2">
            {change.type === 'positive' ? (
              <TrendingUp className="h-4 w-4 text-health-excellent" />
            ) : change.type === 'negative' ? (
              <TrendingDown className="h-4 w-4 text-health-danger" />
            ) : null}
            <span
              className={cn(
                'text-sm font-medium',
                change.type === 'positive'
                  ? 'text-health-excellent'
                  : change.type === 'negative'
                    ? 'text-health-danger'
                    : 'text-muted-foreground'
              )}
            >
              {change.value}
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        )}

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 w-full">
            <Sparkline
              data={sparklineData}
              height={40}
              color={
                change?.type === 'positive'
                  ? 'hsl(var(--health-excellent))'
                  : change?.type === 'negative'
                    ? 'hsl(var(--health-danger))'
                    : 'hsl(var(--primary))'
              }
            />
          </div>
        )}

        {/* Health Score Box */}
        {healthScore && (
          <div className="mt-4">
            <HealthScoreBox
              percentage={healthScore.percentage}
              score={healthScore.score}
              maxScore={healthScore.maxScore}
              trendData={healthScore.trendData}
              hideScore
            />
          </div>
        )}

        {/* Info footer */}
        {info && (
          <div className="mt-4 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              <span className="mr-1">ℹ️</span>
              {info}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
