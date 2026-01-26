'use client'

import { useState } from 'react'
import { X, Sparkles, Zap, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CustomQuestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (question: string) => void
  creditsRemaining: number
}

const exampleQuestions = [
  'Why are my weekday lunch sales declining?',
  'What menu items should I promote more?',
  'How can I reduce food waste during slow periods?',
  'What are competitors doing that I should consider?',
  'How do I improve my Google review rating?',
]

export function CustomQuestionModal({
  isOpen,
  onClose,
  onSubmit,
  creditsRemaining,
}: CustomQuestionModalProps) {
  const [question, setQuestion] = useState('')
  const creditCost = 2
  const canSubmit = question.trim().length > 10 && creditsRemaining >= creditCost

  if (!isOpen) return null

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(question)
      setQuestion('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Ask a Question</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Question Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Your question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about your restaurant's performance..."
              className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Example Questions */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Example questions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {exampleQuestions.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuestion(example)}
                  className="rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Credit Cost Note */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span>
              Custom questions use <strong>{creditCost} credits</strong>. You have{' '}
              <strong>{creditsRemaining}</strong> remaining.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            Ask Question
          </Button>
        </div>
      </div>
    </div>
  )
}
