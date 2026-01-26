import type {
  Organization,
  Location,
  Integration,
  TeamMember,
  NotificationPreferences,
  BillingInfo,
  SocialMediaPreference,
} from '@/types/settings'

export const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Southerleigh Hospitality Group',
  logoUrl: '/logos/southerleigh.png',
}

export const mockLocations: Location[] = [
  {
    id: 'loc-1',
    name: 'Southerleigh Fine Food & Brewery',
    address: '303 Pearl Pkwy',
    city: 'San Antonio',
    state: 'TX',
    zip: '78215',
    timezone: 'America/Chicago',
    conceptType: 'Full Service Restaurant & Brewery',
    operatingHours: 'Mon-Thu: 11am-10pm, Fri-Sat: 11am-11pm, Sun: 10am-9pm',
    status: 'active',
    isDefault: true,
  },
  {
    id: 'loc-2',
    name: 'Southerleigh Haute South',
    address: '1014 S Alamo St',
    city: 'San Antonio',
    state: 'TX',
    zip: '78210',
    timezone: 'America/Chicago',
    conceptType: 'Full Service Restaurant',
    status: 'active',
    isDefault: false,
  },
  {
    id: 'loc-3',
    name: 'Brasserie Mon Chou Chou',
    address: '312 Pearl Pkwy',
    city: 'San Antonio',
    state: 'TX',
    zip: '78215',
    timezone: 'America/Chicago',
    conceptType: 'French Brasserie',
    status: 'active',
    isDefault: false,
  },
  {
    id: 'loc-4',
    name: 'Boiler House',
    address: '312 Pearl Pkwy Suite 2201',
    city: 'San Antonio',
    state: 'TX',
    zip: '78215',
    timezone: 'America/Chicago',
    conceptType: 'Texas Grill & Wine Garden',
    status: 'active',
    isDefault: false,
  },
]

export const mockIntegrations: Integration[] = [
  // === USER CONNECTS ===

  // POS
  {
    id: 'int-1',
    type: 'toast',
    name: 'Toast POS',
    description: 'Sales, labor, menu data',
    category: 'pos',
    connectionType: 'user',
    status: 'connected',
    lastSyncAt: '2025-01-26T06:00:00Z',
    logoUrl: '/integrations/toast.svg',
  },
  {
    id: 'int-2',
    type: 'square',
    name: 'Square POS',
    description: 'Sales, inventory, customers',
    category: 'pos',
    connectionType: 'user',
    status: 'available',
    logoUrl: '/integrations/square.svg',
  },

  // Accounting
  {
    id: 'int-3',
    type: 'r365',
    name: 'Restaurant365',
    description: 'Food cost, invoices, P&L',
    category: 'accounting',
    connectionType: 'user',
    status: 'connected',
    lastSyncAt: '2025-01-26T06:00:00Z',
    logoUrl: '/integrations/r365.svg',
  },
  {
    id: 'int-4',
    type: 'marginedge',
    name: 'MarginEdge',
    description: 'Invoice processing, food cost',
    category: 'accounting',
    connectionType: 'user',
    status: 'available',
    logoUrl: '/integrations/marginedge.svg',
  },

  // Reservations
  {
    id: 'int-5',
    type: 'opentable',
    name: 'OpenTable',
    description: 'Reservations, guest profiles, covers',
    category: 'reservations',
    connectionType: 'user',
    status: 'connected',
    lastSyncAt: '2025-01-26T06:00:00Z',
    logoUrl: '/integrations/opentable.svg',
  },
  {
    id: 'int-6',
    type: 'resy',
    name: 'Resy',
    description: 'Reservations, guest profiles',
    category: 'reservations',
    connectionType: 'user',
    status: 'available',
    logoUrl: '/integrations/resy.svg',
  },
  {
    id: 'int-7',
    type: 'tock',
    name: 'Tock',
    description: 'Reservations, experiences, prepaid events',
    category: 'reservations',
    connectionType: 'user',
    status: 'available',
    logoUrl: '/integrations/tock.svg',
  },

  // === MANAGED BY PROMETHEUS (PRO PLAN) ===

  // Reviews
  {
    id: 'int-8',
    type: 'brightlocal_reviews',
    name: 'Review Monitoring',
    description: 'Google, Yelp, TripAdvisor + 80 more sites',
    category: 'reviews',
    connectionType: 'managed',
    status: 'active',
    lastSyncAt: '2025-01-26T00:00:00Z',
    logoUrl: '/integrations/brightlocal.svg',
    requiresPro: true,
    poweredBy: 'BrightLocal',
  },

  // SEO & Visibility
  {
    id: 'int-9',
    type: 'semrush',
    name: 'Search Visibility',
    description: 'Keyword rankings, local SEO, AI visibility',
    category: 'seo',
    connectionType: 'managed',
    status: 'active',
    lastSyncAt: '2025-01-19T06:00:00Z',
    logoUrl: '/integrations/semrush.svg',
    requiresPro: true,
    poweredBy: 'SEMrush',
  },
  {
    id: 'int-10',
    type: 'brightlocal_local',
    name: 'Local Rankings',
    description: 'Google Maps rankings, local pack tracking',
    category: 'seo',
    connectionType: 'managed',
    status: 'active',
    lastSyncAt: '2025-01-26T06:00:00Z',
    logoUrl: '/integrations/brightlocal.svg',
    requiresPro: true,
    poweredBy: 'BrightLocal',
  },

  // === SOCIAL - USER CHOICE ===

  {
    id: 'int-11',
    type: 'metricool',
    name: 'Prometheus Social Tracking',
    description: 'Instagram, Facebook, TikTok metrics',
    category: 'social',
    connectionType: 'choice',
    status: 'active',
    lastSyncAt: '2025-01-26T06:00:00Z',
    logoUrl: '/integrations/metricool.svg',
    requiresPro: true,
    poweredBy: 'Metricool',
  },
  {
    id: 'int-12',
    type: 'sprout',
    name: 'Sprout Social',
    description: 'Connect your existing Sprout Social account',
    category: 'social',
    connectionType: 'choice',
    status: 'available',
    logoUrl: '/integrations/sprout.svg',
    requiresPro: true,
  },
]

// Social media preference
export const mockSocialPreference: SocialMediaPreference = {
  method: 'managed',
  connectedService: 'metricool',
}

export const mockTeam: TeamMember[] = [
  {
    id: 'user-1',
    name: 'Ryan Kelly',
    email: 'ryan@pearanalytics.com',
    role: 'owner',
    locationAccess: 'all',
    status: 'active',
  },
  {
    id: 'user-2',
    name: 'Jeff Balfour',
    email: 'jeff@southerleigh.com',
    role: 'admin',
    locationAccess: 'all',
    status: 'active',
  },
  {
    id: 'user-3',
    name: 'Sarah Martinez',
    email: 'sarah@southerleigh.com',
    role: 'manager',
    locationAccess: ['loc-1'],
    status: 'active',
  },
  {
    id: 'user-4',
    name: '',
    email: 'mike@southerleigh.com',
    role: 'viewer',
    locationAccess: 'all',
    status: 'pending',
    invitedAt: '2025-01-24T10:00:00Z',
  },
]

export const mockNotificationPreferences: NotificationPreferences = {
  weeklyDigest: { email: true, sms: false },
  intelligenceAlerts: { email: true, sms: true },
  newReviews: { email: true, sms: false },
  syncFailures: { email: true, sms: false },
  salesDeclineThreshold: 10,
  salesDeclineComparison: 'year',
  laborCostThreshold: 35,
  reviewRatingThreshold: 3,
}

export const mockBilling: BillingInfo = {
  plan: 'pro',
  priceMonthly: 149,
  locationsIncluded: 5,
  intelligenceRunsIncluded: 20,
  locationsUsed: 4,
  intelligenceRunsUsed: 8,
  nextBillingDate: '2025-02-01',
  paymentMethod: {
    type: 'card',
    brand: 'Visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2026,
  },
  invoices: [
    {
      id: 'inv-3',
      date: '2025-01-01',
      description: 'Pro Plan - Monthly',
      amount: 99.0,
      downloadUrl: '#',
    },
    {
      id: 'inv-2',
      date: '2024-12-01',
      description: 'Pro Plan - Monthly',
      amount: 99.0,
      downloadUrl: '#',
    },
    {
      id: 'inv-1',
      date: '2024-11-01',
      description: 'Pro Plan - Monthly',
      amount: 99.0,
      downloadUrl: '#',
    },
  ],
}

// US States for location form
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

// US Timezones
export const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona (No DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
]

// Restaurant concept types
export const CONCEPT_TYPES = [
  { value: 'full_service', label: 'Full Service Restaurant' },
  { value: 'fast_casual', label: 'Fast Casual' },
  { value: 'quick_service', label: 'Quick Service' },
  { value: 'fine_dining', label: 'Fine Dining' },
  { value: 'bar_lounge', label: 'Bar / Lounge' },
  { value: 'cafe', label: 'Cafe / Coffee Shop' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'catering', label: 'Catering' },
  { value: 'other', label: 'Other' },
]

// Team roles with descriptions
export const TEAM_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all locations, can manage team' },
  { value: 'manager', label: 'Manager', description: 'Full access to assigned locations only' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to assigned locations' },
]
