'use client'

import { useState } from 'react'
import {
  TrendingUp,
  PieChart,
  Receipt,
  DollarSign,
  BarChart3,
  Layers,
  Users,
  Calendar,
  Wallet,
  Search,
  FileText,
  Heart,
  Target,
  ChevronDown,
  MessageCircle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RecommendedCard } from './recommended-card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { RecommendedReport, ReportCategory } from '@/types/intelligence'

const iconMap: Record<string, LucideIcon> = {
  TrendingUp,
  PieChart,
  Receipt,
  DollarSign,
  BarChart3,
  Layers,
  Users,
  Calendar,
  Wallet,
  Search,
  FileText,
  Heart,
  Target,
}

interface ReportSidebarProps {
  selectedReport: string | null
  onSelectReport: (reportId: string) => void
  recommendedReports: RecommendedReport[]
  categories: ReportCategory[]
  onAskQuestion: () => void
}

export function ReportSidebar({
  selectedReport,
  onSelectReport,
  recommendedReports,
  categories,
  onAskQuestion,
}: ReportSidebarProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(categories.map((c) => c.name))

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Recommended Reports */}
      {recommendedReports.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Recommended for You
          </h3>
          <div className="space-y-2">
            {recommendedReports.map((report) => (
              <RecommendedCard
                key={report.id}
                report={report}
                isSelected={selectedReport === report.id}
                onClick={() => onSelectReport(report.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Reports */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Available Reports
        </h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <Collapsible
              key={category.name}
              open={openCategories.includes(category.name)}
              onOpenChange={() => toggleCategory(category.name)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                <span>{category.name}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    openCategories.includes(category.name) && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-2 mt-1 space-y-1">
                  {category.reports.map((report) => {
                    const Icon = iconMap[report.icon] || FileText
                    const isSelected = selectedReport === report.id
                    return (
                      <button
                        key={report.id}
                        onClick={() => onSelectReport(report.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                          isSelected
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{report.name}</span>
                      </button>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Custom Question */}
      <div className="mt-4 pt-4 border-t">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Custom
        </h3>
        <button
          onClick={onAskQuestion}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Ask a question</span>
          <Sparkles className="h-3 w-3 ml-auto" />
        </button>
      </div>
    </div>
  )
}
