'use client'

import Link from 'next/link'
import { FlaskConical, MessageSquare, HelpCircle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDemo } from './demo-provider'

export function DemoBanner() {
  const { openFeedback, toggleWalkthrough, currentPageContext } = useDemo()

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          <span className="text-sm font-medium">
            DEMO MODE — You&apos;re viewing Prometheus with sample data
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/feedback">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
            >
              <Inbox className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Feedback</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={openFeedback}
            className="h-7 gap-1.5 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Leave Feedback</span>
          </Button>
          {currentPageContext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleWalkthrough}
              className="h-7 w-7 p-0 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
