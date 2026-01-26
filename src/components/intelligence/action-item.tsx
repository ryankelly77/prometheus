'use client'

import { useState } from 'react'
import { ChevronDown, FileText, Download, ExternalLink } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ActionItem as ActionItemType } from '@/types/intelligence'

interface ActionItemProps {
  action: ActionItemType
  onToggle: (completed: boolean) => void
}

export function ActionItem({ action, onToggle }: ActionItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasDetails = action.subTasks.length > 0 || (action.resources && action.resources.length > 0)

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        action.completed && 'bg-muted/30 opacity-75'
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={action.completed}
          onCheckedChange={(checked) => onToggle(checked as boolean)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={cn('font-medium', action.completed && 'line-through text-muted-foreground')}
            >
              {action.title}
            </h4>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                action.difficulty === 'EASY' && 'border-health-excellent text-health-excellent',
                action.difficulty === 'MEDIUM' && 'border-health-warning text-health-warning',
                action.difficulty === 'HARD' && 'border-health-danger text-health-danger'
              )}
            >
              {action.difficulty.toLowerCase()}
            </Badge>
            {action.estimatedImpact && (
              <span className="text-sm text-health-excellent font-medium">
                {action.estimatedImpact}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{action.description}</p>

          {/* Expandable Details */}
          {hasDetails && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
              <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline">
                <span>{isOpen ? 'Hide details' : 'Show details'}</span>
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {/* Sub-tasks */}
                {action.subTasks.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                      Sub-tasks
                    </h5>
                    <ul className="space-y-1.5">
                      {action.subTasks.map((task, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="text-muted-foreground/50">•</span>
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resources */}
                {action.resources && action.resources.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                      Resources
                    </h5>
                    <div className="space-y-2">
                      {action.resources.map((resource, idx) => (
                        <ResourceItem key={idx} resource={resource} />
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  )
}

function ResourceItem({ resource }: { resource: NonNullable<ActionItemType['resources']>[0] }) {
  const [showContent, setShowContent] = useState(false)

  return (
    <div className="rounded-lg border bg-muted/30">
      <button
        onClick={() => setShowContent(!showContent)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
      >
        {resource.type === 'template' && <FileText className="h-4 w-4 text-primary" />}
        {resource.type === 'script' && <Download className="h-4 w-4 text-primary" />}
        {resource.type === 'link' && <ExternalLink className="h-4 w-4 text-primary" />}
        <span className="font-medium text-primary">{resource.title}</span>
        <ChevronDown
          className={cn('h-4 w-4 ml-auto transition-transform', showContent && 'rotate-180')}
        />
      </button>
      {showContent && resource.content && (
        <div className="border-t px-3 py-3">
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono bg-background rounded p-3 max-h-60 overflow-y-auto">
            {resource.content}
          </pre>
        </div>
      )}
    </div>
  )
}
