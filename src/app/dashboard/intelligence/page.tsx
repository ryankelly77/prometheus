'use client'

import { useState, useEffect, useCallback } from 'react'
import { Brain, History, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useLocation } from '@/hooks/use-location'
import {
  reportCategories,
  mockRecommendedReports,
  mockReportDefinitions,
  mockUsage,
  mockRecentReports,
  mockSalesDeclineReport,
  mockRunningSteps,
} from '@/lib/intelligence-mock-data'
import {
  UsageBadge,
  ReportSidebar,
  ReportPreview,
  RunningState,
  ReportResult,
  RecentReports,
  CustomQuestionModal,
  InsightsPanel,
} from '@/components/intelligence'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { IntelligenceReport, ReportDefinition } from '@/types/intelligence'

type ViewMode = 'default' | 'preview' | 'running' | 'result' | 'history'

export default function IntelligencePage() {
  const { currentLocation, isAllLocations } = useLocation()

  // State
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('default')
  const [showHistory, setShowHistory] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)

  // Running state
  const [progress, setProgress] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [runningSteps, setRunningSteps] = useState(mockRunningSteps)

  // Report result state (with action tracking)
  const [reportResult, setReportResult] = useState<IntelligenceReport | null>(null)

  // Get the report definition for preview
  const getReportDefinition = useCallback((reportId: string): ReportDefinition | null => {
    // Check if it's a recommended report
    const recommended = mockRecommendedReports.find((r) => r.id === reportId)
    if (recommended) {
      // Map recommended to actual report definition
      if (recommended.type === 'SALES_DECLINE_ANALYSIS') {
        return mockReportDefinitions['sales-decline']
      }
      if (recommended.type === 'REVIEW_RESPONSE_STRATEGY') {
        return mockReportDefinitions['review-response']
      }
    }

    // Check direct report definitions
    return mockReportDefinitions[reportId] || null
  }, [])

  // Handle report selection
  const handleSelectReport = (reportId: string) => {
    setSelectedReport(reportId)
    setViewMode('preview')
    setShowHistory(false)
  }

  // Handle running the analysis
  const handleRunAnalysis = () => {
    setViewMode('running')
    setProgress(0)
    setCurrentStepIndex(0)
    setRunningSteps(mockRunningSteps.map((s, i) => ({ ...s, status: i === 0 ? 'current' : 'pending' as const })))

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 2
      })
    }, 100)

    // Simulate step progression
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const newIndex = prev + 1
        if (newIndex >= mockRunningSteps.length) {
          clearInterval(stepInterval)
          // Show result after all steps complete
          setTimeout(() => {
            setReportResult({
              ...mockSalesDeclineReport,
              requestedAt: new Date().toISOString(),
            })
            setViewMode('result')
          }, 500)
          return prev
        }

        // Update step statuses
        setRunningSteps((steps) =>
          steps.map((s, i) => ({
            ...s,
            status: i < newIndex ? 'complete' : i === newIndex ? 'current' : 'pending',
          }))
        )

        return newIndex
      })
    }, 1000)
  }

  // Handle cancel
  const handleCancel = () => {
    setViewMode(selectedReport ? 'preview' : 'default')
  }

  // Handle action toggle
  const handleToggleAction = (actionId: string, completed: boolean) => {
    if (!reportResult) return

    setReportResult((prev) => {
      if (!prev) return prev

      const updateActions = (actions: typeof prev.actionPlan.immediate) =>
        actions.map((a) => (a.id === actionId ? { ...a, completed } : a))

      return {
        ...prev,
        actionPlan: {
          immediate: updateActions(prev.actionPlan.immediate),
          shortTerm: updateActions(prev.actionPlan.shortTerm),
          longTerm: updateActions(prev.actionPlan.longTerm),
        },
        actionsCompleted: completed
          ? prev.actionsCompleted + 1
          : Math.max(0, prev.actionsCompleted - 1),
      }
    })
  }

  // Handle rating
  const handleRateReport = (rating: number) => {
    if (!reportResult) return
    setReportResult((prev) => (prev ? { ...prev, userRating: rating } : prev))
  }

  // Handle custom question
  const handleAskQuestion = () => {
    setShowQuestionModal(true)
  }

  const handleSubmitQuestion = (question: string) => {
    setShowQuestionModal(false)
    // For demo, just run the sales decline report
    handleRunAnalysis()
  }

  // Get current step name for running state
  const currentStepName = runningSteps[currentStepIndex]?.name || 'Processing...'

  // Get report definition for preview
  const currentReportDef = selectedReport ? getReportDefinition(selectedReport) : null

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              {isAllLocations
                ? 'AI-powered insights across all locations'
                : `AI-powered insights for ${currentLocation?.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings/intelligence"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Edit what Prometheus knows about you
          </Link>
          <Button
            variant={showHistory ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setShowHistory(!showHistory)
              if (!showHistory) {
                setViewMode('history')
                setSelectedReport(null)
              } else {
                setViewMode('default')
              }
            }}
            className="gap-1.5"
          >
            <History className="h-4 w-4" />
            History
          </Button>
          <UsageBadge used={mockUsage.used} limit={mockUsage.limit} />
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Sidebar */}
        <div className="w-72 shrink-0 overflow-y-auto">
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <ReportSidebar
                selectedReport={selectedReport}
                onSelectReport={handleSelectReport}
                recommendedReports={mockRecommendedReports}
                categories={reportCategories}
                onAskQuestion={handleAskQuestion}
              />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Default State - Show Insights Panel */}
          {viewMode === 'default' && !showHistory && (
            <div className="space-y-6">
              {/* Insights Panel - Real AI-generated insights from DB */}
              {currentLocation && !isAllLocations && (
                <InsightsPanel
                  locationId={currentLocation.id}
                  locationName={currentLocation.name}
                />
              )}

              {/* Message for "All Locations" view */}
              {isAllLocations && (
                <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-muted/30">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-3">
                    <Brain className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold mb-1">Select a Location</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Choose a specific location from the dropdown to view AI-powered insights.
                  </p>
                </div>
              )}

              {/* Prompt to select a report for deeper analysis */}
              {currentLocation && !isAllLocations && (
                <div className="flex flex-col items-center justify-center text-center py-8 border rounded-lg bg-muted/30">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-3">
                    <Brain className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold mb-1">Want a Deeper Analysis?</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Select a report from the sidebar to get detailed AI analysis and actionable recommendations.
                  </p>
                  {mockRecommendedReports.length > 0 && (
                    <p className="text-xs text-primary mt-2">
                      {mockRecommendedReports.length} recommended reports based on your data
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Preview State */}
          {viewMode === 'preview' && currentReportDef && (
            <ReportPreview
              report={currentReportDef}
              onRun={handleRunAnalysis}
              creditsRemaining={mockUsage.limit - mockUsage.used}
            />
          )}

          {/* Running State */}
          {viewMode === 'running' && (
            <RunningState
              reportTitle={currentReportDef?.title || 'Analysis'}
              progress={progress}
              currentStep={currentStepName}
              steps={runningSteps}
              onCancel={handleCancel}
            />
          )}

          {/* Result State */}
          {viewMode === 'result' && reportResult && (
            <ReportResult
              report={reportResult}
              onBack={() => setViewMode('preview')}
              onDownloadPdf={() => alert('PDF download coming soon')}
              onEmail={() => alert('Email feature coming soon')}
              onShare={() => alert('Share feature coming soon')}
              onRateReport={handleRateReport}
              onToggleAction={handleToggleAction}
            />
          )}

          {/* History State */}
          {viewMode === 'history' && (
            <RecentReports
              reports={mockRecentReports}
              onViewReport={(reportId) => {
                // For demo, show the mock report
                setReportResult(mockSalesDeclineReport)
                setViewMode('result')
              }}
            />
          )}
        </div>
      </div>

      {/* Custom Question Modal */}
      <CustomQuestionModal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        onSubmit={handleSubmitQuestion}
        creditsRemaining={mockUsage.limit - mockUsage.used}
      />
    </div>
  )
}
