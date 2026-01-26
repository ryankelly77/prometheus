export interface Organization {
  id: string
  name: string
  logoUrl?: string
}

export interface Location {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  timezone: string
  conceptType: string
  operatingHours?: string
  status: 'active' | 'coming_soon' | 'archived'
  isDefault: boolean
}

export interface Integration {
  id: string
  type: IntegrationType
  name: string
  description: string
  category: 'pos' | 'accounting' | 'reservations' | 'reviews' | 'seo' | 'social'
  status: 'connected' | 'disconnected' | 'error'
  lastSyncAt?: string
  errorMessage?: string
  logoUrl: string
}

export type IntegrationType =
  | 'toast'
  | 'square'
  | 'r365'
  | 'opentable'
  | 'resy'
  | 'brightlocal'
  | 'semrush'
  | 'sprout'
  | 'metricool'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'manager' | 'viewer'
  locationAccess: 'all' | string[]
  status: 'active' | 'pending'
  invitedAt?: string
}

export interface NotificationPreferences {
  weeklyDigest: boolean
  intelligenceAlerts: boolean
  newReviews: boolean
  syncFailures: boolean
  salesDeclineThreshold: number
  salesDeclineComparison: 'week' | 'year'
  laborCostThreshold: number
  reviewRatingThreshold: number
}

export interface BillingInfo {
  plan: 'starter' | 'pro' | 'enterprise'
  priceMonthly: number
  locationsIncluded: number
  intelligenceRunsIncluded: number
  locationsUsed: number
  intelligenceRunsUsed: number
  nextBillingDate: string
  paymentMethod: {
    type: 'card'
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  invoices: Array<{
    id: string
    date: string
    description: string
    amount: number
    downloadUrl: string
  }>
}

export type SettingsTab = 'account' | 'locations' | 'integrations' | 'team' | 'notifications' | 'billing'
