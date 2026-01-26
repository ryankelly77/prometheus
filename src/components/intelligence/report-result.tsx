'use client'

import { ArrowLeft, Download, Mail, Share2, AlertTriangle, CheckCircle2, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RootCauseCard } from './root-cause-card'
import { ActionPlanSection } from './action-plan-section'
import { ProjectedImpact } from './projected-impact'
import { StarRating } from './star-rating'
import type { IntelligenceReport } from '@/types/intelligence'

interface ReportResultProps {
  report: IntelligenceReport
  onBack: () => void
  onDownloadPdf: () => void
  onEmail: () => void
  onShare: () => void
  onRateReport: (rating: number) => void
  onToggleAction: (actionId: string, completed: boolean) => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function ReportResult({
  report,
  onBack,
  onDownloadPdf,
  onEmail,
  onShare,
  onRateReport,
  onToggleAction,
}: ReportResultProps) {
  const completedActions = [
    ...report.actionPlan.immediate,
    ...report.actionPlan.shortTerm,
    ...report.actionPlan.longTerm,
  ].filter((a) => a.completed).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{report.title}</h2>
            <p className="text-sm text-muted-foreground">
              Generated {new Date(report.requestedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onDownloadPdf} className="gap-1.5">
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={onEmail} className="gap-1.5">
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" size="sm" onClick={onShare} className="gap-1.5">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium mb-4">{report.summary.headline}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {report.summary.totalDecline && (
              <div className="rounded-lg bg-background p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Decline</p>
                <p className="text-xl font-bold text-health-danger tabular-nums">
                  -{formatCurrency(report.summary.totalDecline)}
                </p>
                {report.summary.percentDecline && (
                  <p className="text-xs text-health-danger">
                    -{report.summary.percentDecline}% vs prior period
                  </p>
                )}
              </div>
            )}
            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Primary Factor</p>
              <p className="text-sm font-semibold">{report.summary.primaryFactor}</p>
            </div>
            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Recovery Potential</p>
              <p className="text-xl font-bold text-health-excellent tabular-nums">
                +{formatCurrency(report.summary.recoveryEstimate)}
              </p>
              <p className="text-xs text-muted-foreground">if actions completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Root Causes */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-health-warning" />
          Root Causes
          <Badge variant="secondary" className="ml-1">
            {report.rootCauses.length}
          </Badge>
        </h3>
        <div className="space-y-3">
          {report.rootCauses.map((cause, idx) => (
            <RootCauseCard key={cause.id} rootCause={cause} index={idx} />
          ))}
        </div>
      </div>

      {/* Action Plan */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-health-excellent" />
          Action Plan
          <Badge variant="secondary" className="ml-1">
            {completedActions} / {report.actionsTotal} completed
          </Badge>
        </h3>
        <ActionPlanSection actionPlan={report.actionPlan} onToggleAction={onToggleAction} />
      </div>

      {/* Projected Impact */}
      <ProjectedImpact impact={report.projectedImpact} />

      {/* Rating Section */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="font-medium">Was this report helpful?</h4>
              <p className="text-sm text-muted-foreground">
                Your feedback helps us improve our analysis
              </p>
            </div>
            <StarRating rating={report.userRating} onRate={onRateReport} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
