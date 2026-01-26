'use client'

import { ChevronRight, CheckCircle2, DollarSign, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StarRating } from './star-rating'
import type { IntelligenceReportSummary } from '@/types/intelligence'

interface RecentReportsProps {
  reports: IntelligenceReportSummary[]
  onViewReport: (reportId: string) => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentReports({ reports, onViewReport }: RecentReportsProps) {
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No reports yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run your first analysis to see results here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Reports</CardTitle>
        <CardDescription>View your past analyses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => onViewReport(report.id)}
              className="w-full text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{report.title}</h4>
                    <span className="text-xs text-muted-foreground">{timeAgo(report.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{report.summary}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {report.userRating !== null && (
                      <StarRating rating={report.userRating} readonly size="sm" />
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>
                        {report.actionsCompleted}/{report.actionsTotal} actions
                      </span>
                    </div>
                    {report.projectedImpact !== null && (
                      <Badge variant="outline" className="text-xs text-health-excellent border-health-excellent">
                        <DollarSign className="h-3 w-3 mr-0.5" />
                        {formatCurrency(report.projectedImpact)}/mo potential
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
