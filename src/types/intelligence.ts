// ============================================
// INTELLIGENCE TYPES
// ============================================

export type ReportType =
  | 'SALES_DECLINE_ANALYSIS'
  | 'SALES_TRENDS'
  | 'CHANNEL_MIX'
  | 'CHECK_ANALYSIS'
  | 'MENU_PROFITABILITY'
  | 'MENU_ENGINEERING'
  | 'CATEGORY_TRENDS'
  | 'LABOR_OPTIMIZATION'
  | 'STAFFING_RECOMMENDATIONS'
  | 'COST_CONTROL'
  | 'SEO_OPPORTUNITIES'
  | 'CONTENT_STRATEGY'
  | 'GUEST_RETENTION'
  | 'MARKETING_ROI'
  | 'REVIEW_RESPONSE_STRATEGY'
  | 'CUSTOM_QUESTION'

export interface ReportDefinition {
  id: string
  type: ReportType
  title: string
  description: string
  dataSources: string[]
  whatYouGet: string[]
  estimatedTokens: number
  processingTime: string
  creditCost: number
}

export interface RecommendedReport {
  id: string
  type: ReportType
  title: string
  subtitle: string
  severity: 'high' | 'medium'
  icon: string
  triggeredAt: string
}

export interface IntelligenceReportSummary {
  id: string
  type: ReportType
  title: string
  createdAt: string
  summary: string
  userRating: number | null
  actionsCompleted: number
  actionsTotal: number
  projectedImpact: number | null
}

export interface RootCause {
  id: string
  title: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  supportingData: Array<{ metric: string; value: string }>
  relatedReviews: string[]
  externalFactors: string[]
}

export interface ActionResource {
  type: 'script' | 'template' | 'link'
  title: string
  content?: string
}

export interface ActionItem {
  id: string
  title: string
  description: string
  subTasks: string[]
  estimatedImpact: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  completed: boolean
  resources?: ActionResource[]
}

export interface IntelligenceReport {
  id: string
  locationId: string
  reportType: ReportType
  title: string
  requestedAt: string

  summary: {
    headline: string
    totalDecline?: number
    percentDecline?: number
    primaryFactor: string
    recoveryEstimate: number
  }

  rootCauses: RootCause[]

  actionPlan: {
    immediate: ActionItem[]
    shortTerm: ActionItem[]
    longTerm: ActionItem[]
  }

  projectedImpact: {
    currentMonthlySales: number
    projectedRecovery: number
    projectedMonthlySales: number
    timelineWeeks: number
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  }

  isRead: boolean
  userRating: number | null
  userFeedback?: string
  actionsCompleted: number
  actionsTotal: number
}

export interface UsageStats {
  used: number
  limit: number
  resetDate: string
  plan: string
}

export interface ReportCategory {
  name: string
  reports: Array<{
    id: string
    name: string
    icon: string
  }>
}
