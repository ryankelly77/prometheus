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
  connectionType: 'user' | 'managed' | 'choice'
  status: 'connected' | 'available' | 'active' | 'error'
  lastSyncAt?: string
  errorMessage?: string
  logoUrl: string
  requiresPro?: boolean
  poweredBy?: string
}

export type IntegrationType =
  | 'toast'
  | 'square'
  | 'r365'
  | 'marginedge'
  | 'opentable'
  | 'resy'
  | 'tock'
  | 'brightlocal_reviews'
  | 'brightlocal_local'
  | 'semrush'
  | 'sprout'
  | 'metricool'

export interface SocialMediaPreference {
  method: 'managed' | 'byoa'
  connectedService?: 'metricool' | 'sprout'
}

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
  weeklyDigest: { email: boolean; sms: boolean }
  intelligenceAlerts: { email: boolean; sms: boolean }
  newReviews: { email: boolean; sms: boolean }
  syncFailures: { email: boolean; sms: boolean }
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

export type SettingsTab = 'general' | 'branding' | 'locations' | 'integrations' | 'team' | 'notifications' | 'billing'
