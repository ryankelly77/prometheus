'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsageBadgeProps {
  used: number
  limit: number
  onClick?: () => void
}

export function UsageBadge({ used, limit, onClick }: UsageBadgeProps) {
  const remaining = limit - used
  const isLow = remaining <= 2

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        isLow
          ? 'bg-health-warning/10 text-health-warning hover:bg-health-warning/20'
          : 'bg-primary/10 text-primary hover:bg-primary/20'
      )}
    >
      <Zap className="h-4 w-4" />
      <span className="tabular-nums">
        {remaining} of {limit} runs remaining
      </span>
    </button>
  )
}
