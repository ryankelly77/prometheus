'use client'

import { Activity, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkline } from '@/components/charts/sparkline'

interface HealthScoreCardProps {
  score: number
  trend: number[]
  onClick?: () => void
  className?: string
}

function getHealthColor(score: number): string {
  if (score >= 100) return 'hsl(142, 76%, 36%)' // --health-excellent (green)
  if (score >= 90) return 'hsl(84, 81%, 44%)'   // --health-good (lime)
  if (score >= 80) return 'hsl(48, 96%, 53%)'   // --health-warning (yellow)
  return 'hsl(0, 84%, 60%)'                      // --health-danger (red)
}

function getHealthLabel(score: number): string {
  if (score >= 100) return 'Excellent'
  if (score >= 90) return 'Good'
  if (score >= 80) return 'Warning'
  return 'Needs Attention'
}

export function HealthScoreCard({
  score,
  trend,
  onClick,
  className,
}: HealthScoreCardProps) {
  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
      style={{
        borderColor: getHealthColor(score),
        borderWidth: '2px',
      }}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Large centered score */}
        <div className="text-center">
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: getHealthColor(score) }}
          >
            <Activity className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Health Score
          </p>
          <p
            className="mt-1 text-5xl font-bold tabular-nums tracking-tight lg:text-6xl"
            style={{ color: getHealthColor(score) }}
          >
            {score.toFixed(2)}
          </p>
          <span
            className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{ backgroundColor: getHealthColor(score) }}
          >
            {getHealthLabel(score)}
          </span>
        </div>

        {/* Sparkline */}
        <div className="mt-5">
          <Sparkline
            data={trend}
            height={48}
            color={getHealthColor(score)}
          />
        </div>

        {/* Click to expand CTA */}
        <div className="mt-4 flex items-center justify-center gap-1 rounded-md border-2 border-dashed py-2.5 text-sm font-medium text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary/5 group-hover:text-primary"
          style={{ borderColor: `${getHealthColor(score)}40` }}
        >
          <span>View Details</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </CardContent>
    </Card>
  )
}
