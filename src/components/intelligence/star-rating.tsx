'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number | null
  onRate?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md'
}

export function StarRating({ rating, onRate, readonly = false, size = 'md' }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          className={cn(
            'transition-colors',
            !readonly && 'hover:scale-110 cursor-pointer',
            readonly && 'cursor-default'
          )}
        >
          <Star
            className={cn(
              iconSize,
              rating !== null && star <= rating
                ? 'fill-health-warning text-health-warning'
                : 'text-muted-foreground/30'
            )}
          />
        </button>
      ))}
    </div>
  )
}
