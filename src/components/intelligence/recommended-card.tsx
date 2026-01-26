'use client'

import {
  TrendingDown,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecommendedReport } from '@/types/intelligence'

const iconMap: Record<string, LucideIcon> = {
  TrendingDown,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Users,
}

interface RecommendedCardProps {
  report: RecommendedReport
  isSelected: boolean
  onClick: () => void
}

export function RecommendedCard({ report, isSelected, onClick }: RecommendedCardProps) {
  const Icon = iconMap[report.icon] || AlertTriangle

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border p-3 transition-all',
        'hover:shadow-md',
        report.severity === 'high' && 'border-l-4 border-l-health-danger',
        report.severity === 'medium' && 'border-l-4 border-l-health-warning',
        isSelected
          ? 'bg-primary/5 border-primary shadow-sm'
          : 'bg-background hover:bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            report.severity === 'high' && 'bg-health-danger/10 text-health-danger',
            report.severity === 'medium' && 'bg-health-warning/10 text-health-warning'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{report.title}</p>
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                report.severity === 'high' && 'bg-health-danger/10 text-health-danger',
                report.severity === 'medium' && 'bg-health-warning/10 text-health-warning'
              )}
            >
              Recommended
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{report.subtitle}</p>
        </div>
      </div>
    </button>
  )
}
