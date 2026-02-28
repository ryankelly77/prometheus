'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface InsightFeedbackProps {
  locationId: string
  insightId: string
  className?: string
  onFeedbackSaved?: () => void
}

type FeedbackState = 'idle' | 'saving' | 'ask-comment' | 'saved' | 'suggest-add'

export function InsightFeedback({
  locationId,
  insightId,
  className,
  onFeedbackSaved,
}: InsightFeedbackProps) {
  const [state, setState] = useState<FeedbackState>('idle')
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null)
  const [comment, setComment] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  const saveFeedback = async (
    feedbackRating: 'helpful' | 'not_helpful',
    userComment?: string
  ) => {
    setState('saving')
    try {
      const response = await fetch('/api/intelligence/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          insightId,
          rating: feedbackRating,
          userComment,
        }),
      })

      const data = await response.json()

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
        setState('suggest-add')
      } else {
        setState('saved')
        onFeedbackSaved?.()
      }
    } catch (error) {
      console.error('Failed to save feedback:', error)
      setState('idle')
    }
  }

  const handleThumbsUp = () => {
    setRating('helpful')
    saveFeedback('helpful')
  }

  const handleThumbsDown = () => {
    setRating('not_helpful')
    setState('ask-comment')
  }

  const handleSubmitComment = () => {
    if (rating) {
      saveFeedback(rating, comment || undefined)
    }
  }

  const handleSkipComment = () => {
    if (rating) {
      saveFeedback(rating)
    }
  }

  const handleAddToProfile = async () => {
    if (!comment.trim()) {
      setState('saved')
      return
    }

    try {
      // Get current profile first
      const profileRes = await fetch(`/api/restaurant/profile?locationId=${locationId}`)
      const profileData = await profileRes.json()

      // Add comment as user context
      const currentContext = profileData.profile?.userContext || []
      const newContext = [...currentContext, comment.trim()]

      // Update profile
      await fetch('/api/restaurant/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          // Keep existing descriptors
          selectedDescriptors: profileData.profile?.selectedDescriptors || [],
        }),
      })

      setState('saved')
      onFeedbackSaved?.()
    } catch (error) {
      console.error('Failed to add to profile:', error)
      setState('saved')
    }
  }

  // Already submitted
  if (state === 'saved') {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>
        Thanks for your feedback!
      </div>
    )
  }

  // Profile suggestion state
  if (state === 'suggest-add') {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-xs text-muted-foreground">
          Thanks! We&apos;ll improve future insights based on your feedback.
        </p>
        {comment.trim() && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Add to your restaurant profile?</span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={handleAddToProfile}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => setState('saved')}
            >
              Skip
            </Button>
          </div>
        )}
        {!comment.trim() && suggestions.length > 0 && (
          <p className="text-xs text-primary">
            Tip: {suggestions[0]}
          </p>
        )}
      </div>
    )
  }

  // Comment input state
  if (state === 'ask-comment') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-2">
          <ThumbsDown className="h-4 w-4 text-red-500" />
          <span className="text-xs text-muted-foreground">Tell us why (optional):</span>
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="e.g., The pricing assumption was wrong for our market..."
          className="min-h-[60px] text-sm"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSubmitComment}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleSkipComment}>
            Skip
          </Button>
        </div>
      </div>
    )
  }

  // Saving state
  if (state === 'saving') {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving...
      </div>
    )
  }

  // Idle state - show buttons
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-xs text-muted-foreground">Was this helpful?</span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            'h-7 px-2 text-xs gap-1',
            rating === 'helpful' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          )}
          onClick={handleThumbsUp}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Helpful
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            'h-7 px-2 text-xs gap-1',
            rating === 'not_helpful' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
          onClick={handleThumbsDown}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          Not useful
        </Button>
      </div>
    </div>
  )
}
