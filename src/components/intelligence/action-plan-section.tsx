'use client'

import { Zap, Clock, Calendar } from 'lucide-react'
import { ActionItem } from './action-item'
import type { ActionItem as ActionItemType } from '@/types/intelligence'

interface ActionPlanSectionProps {
  actionPlan: {
    immediate: ActionItemType[]
    shortTerm: ActionItemType[]
    longTerm: ActionItemType[]
  }
  onToggleAction: (actionId: string, completed: boolean) => void
}

export function ActionPlanSection({ actionPlan, onToggleAction }: ActionPlanSectionProps) {
  const sections = [
    {
      title: 'Do Now',
      subtitle: 'Immediate actions (this week)',
      icon: Zap,
      iconColor: 'text-health-danger',
      actions: actionPlan.immediate,
    },
    {
      title: 'Short Term',
      subtitle: 'Complete within 2-4 weeks',
      icon: Clock,
      iconColor: 'text-health-warning',
      actions: actionPlan.shortTerm,
    },
    {
      title: 'Long Term',
      subtitle: 'Strategic initiatives (1-3 months)',
      icon: Calendar,
      iconColor: 'text-muted-foreground',
      actions: actionPlan.longTerm,
    },
  ]

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        if (section.actions.length === 0) return null

        const Icon = section.icon
        return (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`h-5 w-5 ${section.iconColor}`} />
              <div>
                <h4 className="font-semibold">{section.title}</h4>
                <p className="text-xs text-muted-foreground">{section.subtitle}</p>
              </div>
            </div>
            <div className="space-y-3">
              {section.actions.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  onToggle={(completed) => onToggleAction(action.id, completed)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
