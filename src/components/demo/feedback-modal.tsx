'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useDemo } from './demo-provider'
import { submitFeedback } from '@/lib/feedback'

export function FeedbackModal() {
  const { isFeedbackOpen, closeFeedback, currentPageContext, currentPath } = useDemo()
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !comment.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    const result = await submitFeedback({
      name: name.trim(),
      page: currentPageContext?.title || currentPath,
      comment: comment.trim(),
    })

    setIsSubmitting(false)

    if (result.success) {
      toast.success('Thanks for your feedback!')
      setName('')
      setComment('')
      closeFeedback()
    } else {
      toast.error(result.error || 'Failed to submit feedback')
    }
  }

  if (!isFeedbackOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={closeFeedback}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Leave Feedback</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeFeedback}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            We&apos;d love to hear your thoughts on Prometheus!
          </p>

          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="feedback-name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="feedback-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your name"
              required
            />
          </div>

          {/* Current Page */}
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Current Page:</span>
            <span className="ml-2 text-sm font-medium">
              {currentPageContext?.title || currentPath}
            </span>
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label htmlFor="feedback-comment" className="text-sm font-medium">
              Your Feedback <span className="text-red-500">*</span>
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="What do you think? Any suggestions, issues, or features you'd like to see?"
              required
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </form>
      </div>
    </>
  )
}
