'use client'

import { useState } from 'react'
import { ChevronDown, MessageSquare, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ConfidenceBadge } from './confidence-badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { RootCause } from '@/types/intelligence'

interface RootCauseCardProps {
  rootCause: RootCause
  index: number
}

export function RootCauseCard({ rootCause, index }: RootCauseCardProps) {
  const [isOpen, setIsOpen] = useState(index === 0)

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="text-left">
                  <h4 className="font-semibold">{rootCause.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {rootCause.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ConfidenceBadge confidence={rootCause.confidence} />
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Supporting Data */}
            {rootCause.supportingData.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium mb-2">Supporting Data</h5>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rootCause.supportingData.map((data, idx) => (
                    <div key={idx} className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-sm text-muted-foreground">{data.metric}</span>
                      <span className="text-sm font-medium tabular-nums">{data.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Reviews */}
            {rootCause.relatedReviews.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Related Reviews
                </h5>
                <div className="space-y-2">
                  {rootCause.relatedReviews.map((review, idx) => (
                    <blockquote
                      key={idx}
                      className="border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground"
                    >
                      {review}
                    </blockquote>
                  ))}
                </div>
              </div>
            )}

            {/* External Factors */}
            {rootCause.externalFactors.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  External Factors
                </h5>
                <ul className="space-y-1">
                  {rootCause.externalFactors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
