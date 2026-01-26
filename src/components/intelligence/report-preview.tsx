'use client'

import { Check, Clock, Database, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ReportDefinition } from '@/types/intelligence'

interface ReportPreviewProps {
  report: ReportDefinition
  onRun: () => void
  creditsRemaining: number
}

export function ReportPreview({ report, onRun, creditsRemaining }: ReportPreviewProps) {
  const canRun = creditsRemaining >= report.creditCost

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{report.title}</h2>
        <p className="text-muted-foreground mt-1">{report.description}</p>
      </div>

      {/* Data Sources */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Data Sources Included
          </CardTitle>
          <CardDescription>We&apos;ll analyze the following data</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {report.dataSources.map((source, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-health-excellent shrink-0" />
                <span>{source}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* What You'll Get */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            What You&apos;ll Get
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.whatYouGet.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-health-excellent shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Processing Info & Run Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{report.processingTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                <span>{report.creditCost} credit</span>
              </div>
            </div>
            <Button
              size="lg"
              onClick={onRun}
              disabled={!canRun}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Run Analysis
            </Button>
          </div>
          {!canRun && (
            <p className="text-sm text-health-danger mt-3">
              Not enough credits remaining. Upgrade your plan or wait for reset.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
