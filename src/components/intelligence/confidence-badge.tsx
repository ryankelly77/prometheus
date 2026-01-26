'use client'

import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  size?: 'sm' | 'md'
}

export function ConfidenceBadge({ confidence, size = 'md' }: ConfidenceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        confidence === 'HIGH' && 'bg-health-danger/10 text-health-danger',
        confidence === 'MEDIUM' && 'bg-health-warning/10 text-health-warning',
        confidence === 'LOW' && 'bg-muted text-muted-foreground'
      )}
    >
      {confidence}
    </span>
  )
}
