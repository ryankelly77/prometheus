'use client'

import { X, Database, Lightbulb, Clock, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDemo } from './demo-provider'
import { cn } from '@/lib/utils'

export function WalkthroughPanel() {
  const { isWalkthroughOpen, closeWalkthrough, openFeedback, currentPageContext } = useDemo()

  if (!currentPageContext) return null

  return (
    <>
      {/* Backdrop */}
      {isWalkthroughOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={closeWalkthrough}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-[40px] z-40 h-[calc(100vh-40px)] w-80 transform bg-card border-l shadow-xl transition-transform duration-300 ease-in-out overflow-y-auto',
          isWalkthroughOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-card px-4 py-3">
          <h2 className="font-semibold">About This Page</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeWalkthrough}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Page Title */}
          <div>
            <h3 className="text-lg font-semibold text-primary">{currentPageContext.title}</h3>
          </div>

          {/* Description */}
          <div>
            <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              What You&apos;re Seeing
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentPageContext.description}
            </p>
          </div>

          {/* Data Sources */}
          {currentPageContext.dataSources.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                <Database className="h-3.5 w-3.5" />
                Data Sources
              </h4>
              <ul className="space-y-1.5">
                {currentPageContext.dataSources.map((source, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      <span className="font-medium">{source.name}</span>
                      <span className="text-muted-foreground"> → {source.source}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Demo Note */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
              <Lightbulb className="h-3.5 w-3.5" />
              Demo Note
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentPageContext.demoNote}
            </p>
          </div>

          {/* Coming Soon */}
          {currentPageContext.comingSoon.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                <Clock className="h-3.5 w-3.5" />
                Coming Soon
              </h4>
              <ul className="space-y-1.5">
                {currentPageContext.comingSoon.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-muted-foreground/50">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Divider */}
          <hr className="border-border" />

          {/* Feedback CTA */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              closeWalkthrough()
              openFeedback()
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Leave Feedback About This Page
          </Button>
        </div>
      </div>
    </>
  )
}
