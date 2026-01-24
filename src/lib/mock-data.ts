// =============================================================================
// PROMETHEUS MOCK DATA
// =============================================================================
// Use this data to build UI components before connecting to real backend.
// All data reflects realistic restaurant KPIs for a mid-to-upscale restaurant.
// =============================================================================

// -----------------------------------------------------------------------------
// TYPES (will move to /types when setting up real project)
// -----------------------------------------------------------------------------

export interface Location {
  id: string
  name: string
  totalSeats: number
  cuisineType: string
  timezone: string
}

export interface MonthlyMetrics {
  month: string // YYYY-MM
  totalSales: number
  foodSales: number
  alcoholSales: number
  beerSales: number
  wineSales: number
  laborCosts: number
  foodCosts: number
  totalCustomers: number
  ppa: number // Per Person Average
  primeCost: number // As percentage
  revPash: number // Revenue per Available Seat Hour
}

export interface CustomerLoyalty {
  month: string
  oneVisit: number
  twoToNineVisits: number
  tenPlusVisits: number
  percentThreePlus: number
}

export interface ReviewMetrics {
  month: string
  totalCount: number
  averageRating: number
  newReviewsCount: number
  oneStarCount: number
  twoStarCount: number
  threeStarCount: number
  fourStarCount: number
  fiveStarCount: number
}

export interface WebsiteVisibility {
  month: string
  visibilityPercent: number
}

export interface PRMention {
  month: string
  count: number
}

export interface HealthScoreBreakdown {
  metric: string
  weight: number
  actual: number
  target: number
  score: number
  weightedScore: number
}

export interface HealthScore {
  overallScore: number
  breakdown: HealthScoreBreakdown[]
  ebitdaAdjustment: number
  trend: number[] // Last 12 months
}

// -----------------------------------------------------------------------------
// CURRENT USER & ORGANIZATION
// -----------------------------------------------------------------------------

export const mockUser = {
  id: 'user_01',
  name: 'Ryan Kelly',
  email: 'ryan@pearanalytics.com',
  avatarUrl: null,
  role: 'partner_admin' as const,
}

export const mockOrganization = {
  id: 'org_01',
  name: 'Southerleigh Hospitality Group',
  slug: 'southerleigh',
  plan: 'PRO' as const,
  branding: {
    appName: 'Southerleigh Analytics',
    logo: '/logos/southerleigh.svg',
    colors: {
      primary: '#1e40af',
      primaryHover: '#1e3a8a',
    },
  },
}

// -----------------------------------------------------------------------------
// LOCATIONS
// -----------------------------------------------------------------------------

export const mockLocations: Location[] = [
  {
    id: 'loc_01',
    name: 'Southerleigh Fine Food & Brewery',
    totalSeats: 250,
    cuisineType: 'AMERICAN_MODERN',
    timezone: 'America/Chicago',
  },
  {
    id: 'loc_02',
    name: 'Southerleigh Haute South',
    totalSeats: 180,
    cuisineType: 'AMERICAN',
    timezone: 'America/Chicago',
  },
  {
    id: 'loc_03',
    name: 'Arcade Midtown Kitchen',
    totalSeats: 150,
    cuisineType: 'AMERICAN_MODERN',
    timezone: 'America/Chicago',
  },
]

// -----------------------------------------------------------------------------
// TARGETS (What we're measuring against)
// -----------------------------------------------------------------------------

export const mockTargets = {
  totalSales: 567694,
  foodSales: 340616,
  alcoholSales: 56769,
  beerSales: 17030,
  wineSales: 45415,
  laborCosts: 28, // percentage
  foodCosts: 32, // percentage
  primeCost: 60, // percentage
  ppa: 57,
  customerLoyalty: 15, // percentage with 3+ visits
  reviews: 4.5,
  prMentions: 3,
  websiteVisibility: 35,
}

// -----------------------------------------------------------------------------
// MONTHLY METRICS (Last 12 months)
// -----------------------------------------------------------------------------

export const mockMonthlyMetrics: MonthlyMetrics[] = [
  {
    month: '2025-01',
    totalSales: 507855,
    foodSales: 301156,
    alcoholSales: 52311,
    beerSales: 14203,
    wineSales: 41892,
    laborCosts: 142199,
    foodCosts: 162513,
    totalCustomers: 8721,
    ppa: 58.23,
    primeCost: 59.98,
    revPash: 12.43,
  },
  {
    month: '2024-12',
    totalSales: 589234,
    foodSales: 348923,
    alcoholSales: 61234,
    beerSales: 17234,
    wineSales: 48123,
    laborCosts: 159094,
    foodCosts: 182863,
    totalCustomers: 9834,
    ppa: 59.92,
    primeCost: 58.02,
    revPash: 14.21,
  },
  {
    month: '2024-11',
    totalSales: 534521,
    foodSales: 318234,
    alcoholSales: 54123,
    beerSales: 15234,
    wineSales: 43234,
    laborCosts: 149666,
    foodCosts: 168075,
    totalCustomers: 9123,
    ppa: 58.59,
    primeCost: 59.42,
    revPash: 12.89,
  },
  {
    month: '2024-10',
    totalSales: 521345,
    foodSales: 309876,
    alcoholSales: 52876,
    beerSales: 14987,
    wineSales: 42345,
    laborCosts: 146777,
    foodCosts: 163942,
    totalCustomers: 8934,
    ppa: 58.35,
    primeCost: 59.61,
    revPash: 12.54,
  },
  {
    month: '2024-09',
    totalSales: 498234,
    foodSales: 295234,
    alcoholSales: 50234,
    beerSales: 14234,
    wineSales: 40234,
    laborCosts: 144488,
    foodCosts: 159435,
    totalCustomers: 8567,
    ppa: 58.16,
    primeCost: 61.01,
    revPash: 11.98,
  },
  {
    month: '2024-08',
    totalSales: 512456,
    foodSales: 304567,
    alcoholSales: 51456,
    beerSales: 14567,
    wineSales: 41234,
    laborCosts: 148612,
    foodCosts: 162939,
    totalCustomers: 8789,
    ppa: 58.31,
    primeCost: 60.81,
    revPash: 12.32,
  },
  {
    month: '2024-07',
    totalSales: 478923,
    foodSales: 284567,
    alcoholSales: 48234,
    beerSales: 13567,
    wineSales: 38456,
    laborCosts: 138888,
    foodCosts: 153255,
    totalCustomers: 8234,
    ppa: 58.17,
    primeCost: 61.01,
    revPash: 11.52,
  },
  {
    month: '2024-06',
    totalSales: 543234,
    foodSales: 322345,
    alcoholSales: 54876,
    beerSales: 15456,
    wineSales: 43987,
    laborCosts: 152105,
    foodCosts: 170836,
    totalCustomers: 9345,
    ppa: 58.13,
    primeCost: 59.44,
    revPash: 13.08,
  },
  {
    month: '2024-05',
    totalSales: 532456,
    foodSales: 315678,
    alcoholSales: 53678,
    beerSales: 15123,
    wineSales: 42987,
    laborCosts: 149488,
    foodCosts: 167213,
    totalCustomers: 9156,
    ppa: 58.15,
    primeCost: 59.48,
    revPash: 12.82,
  },
  {
    month: '2024-04',
    totalSales: 498765,
    foodSales: 295432,
    alcoholSales: 50234,
    beerSales: 14123,
    wineSales: 40345,
    laborCosts: 144642,
    foodCosts: 159605,
    totalCustomers: 8567,
    ppa: 58.22,
    primeCost: 60.97,
    revPash: 12.01,
  },
  {
    month: '2024-03',
    totalSales: 512345,
    foodSales: 303456,
    alcoholSales: 51567,
    beerSales: 14567,
    wineSales: 41234,
    laborCosts: 148580,
    foodCosts: 163950,
    totalCustomers: 8789,
    ppa: 58.29,
    primeCost: 61.01,
    revPash: 12.33,
  },
  {
    month: '2024-02',
    totalSales: 467890,
    foodSales: 277654,
    alcoholSales: 47123,
    beerSales: 13234,
    wineSales: 37890,
    laborCosts: 140367,
    foodCosts: 151763,
    totalCustomers: 8023,
    ppa: 58.32,
    primeCost: 62.43,
    revPash: 11.26,
  },
]

// Current month data (for easy access)
export const mockCurrentMetrics = mockMonthlyMetrics[0]

// Prior year same month (for YoY comparison)
export const mockPriorYearMetrics: MonthlyMetrics = {
  month: '2024-01',
  totalSales: 489234,
  foodSales: 290123,
  alcoholSales: 49876,
  beerSales: 13987,
  wineSales: 39876,
  laborCosts: 141878,
  foodCosts: 159301,
  totalCustomers: 8412,
  ppa: 58.16,
  primeCost: 61.56,
  revPash: 11.78,
}

// Two years ago same month
export const mockTwoYearsAgoMetrics: MonthlyMetrics = {
  month: '2023-01',
  totalSales: 456789,
  foodSales: 271234,
  alcoholSales: 46234,
  beerSales: 12987,
  wineSales: 36876,
  laborCosts: 136580,
  foodCosts: 150741,
  totalCustomers: 7856,
  ppa: 58.14,
  primeCost: 62.90,
  revPash: 10.99,
}

// -----------------------------------------------------------------------------
// CUSTOMER LOYALTY DATA
// -----------------------------------------------------------------------------

export const mockCustomerLoyalty: CustomerLoyalty[] = [
  { month: '2025-01', oneVisit: 5234, twoToNineVisits: 2876, tenPlusVisits: 611, percentThreePlus: 13.2 },
  { month: '2024-12', oneVisit: 5892, twoToNineVisits: 3234, tenPlusVisits: 708, percentThreePlus: 14.1 },
  { month: '2024-11', oneVisit: 5456, twoToNineVisits: 3012, tenPlusVisits: 655, percentThreePlus: 13.8 },
  { month: '2024-10', oneVisit: 5345, twoToNineVisits: 2945, tenPlusVisits: 644, percentThreePlus: 13.6 },
  { month: '2024-09', oneVisit: 5123, twoToNineVisits: 2823, tenPlusVisits: 621, percentThreePlus: 13.4 },
  { month: '2024-08', oneVisit: 5267, twoToNineVisits: 2890, tenPlusVisits: 632, percentThreePlus: 13.5 },
]

export const mockCurrentLoyalty = mockCustomerLoyalty[0]

// -----------------------------------------------------------------------------
// REVIEW METRICS
// -----------------------------------------------------------------------------

export const mockReviewMetrics: ReviewMetrics[] = [
  { month: '2025-01', totalCount: 1247, averageRating: 4.3, newReviewsCount: 34, oneStarCount: 2, twoStarCount: 3, threeStarCount: 5, fourStarCount: 12, fiveStarCount: 12 },
  { month: '2024-12', totalCount: 1213, averageRating: 4.4, newReviewsCount: 42, oneStarCount: 1, twoStarCount: 2, threeStarCount: 4, fourStarCount: 15, fiveStarCount: 20 },
  { month: '2024-11', totalCount: 1171, averageRating: 4.3, newReviewsCount: 38, oneStarCount: 2, twoStarCount: 4, threeStarCount: 6, fourStarCount: 13, fiveStarCount: 13 },
  { month: '2024-10', totalCount: 1133, averageRating: 4.4, newReviewsCount: 35, oneStarCount: 1, twoStarCount: 2, threeStarCount: 5, fourStarCount: 14, fiveStarCount: 13 },
  { month: '2024-09', totalCount: 1098, averageRating: 4.3, newReviewsCount: 31, oneStarCount: 2, twoStarCount: 3, threeStarCount: 4, fourStarCount: 11, fiveStarCount: 11 },
  { month: '2024-08', totalCount: 1067, averageRating: 4.4, newReviewsCount: 36, oneStarCount: 1, twoStarCount: 2, threeStarCount: 4, fourStarCount: 14, fiveStarCount: 15 },
]

export const mockCurrentReviews = mockReviewMetrics[0]

// -----------------------------------------------------------------------------
// WEBSITE VISIBILITY (SEO)
// -----------------------------------------------------------------------------

export const mockWebsiteVisibility: WebsiteVisibility[] = [
  { month: '2025-01', visibilityPercent: 32.63 },
  { month: '2024-12', visibilityPercent: 34.21 },
  { month: '2024-11', visibilityPercent: 31.45 },
  { month: '2024-10', visibilityPercent: 29.87 },
  { month: '2024-09', visibilityPercent: 28.34 },
  { month: '2024-08', visibilityPercent: 27.12 },
  { month: '2024-07', visibilityPercent: 25.89 },
  { month: '2024-06', visibilityPercent: 26.45 },
  { month: '2024-05', visibilityPercent: 24.78 },
  { month: '2024-04', visibilityPercent: 23.56 },
  { month: '2024-03', visibilityPercent: 22.34 },
  { month: '2024-02', visibilityPercent: 21.12 },
]

export const mockCurrentVisibility = mockWebsiteVisibility[0]

// -----------------------------------------------------------------------------
// PR MENTIONS
// -----------------------------------------------------------------------------

export const mockPRMentions: PRMention[] = [
  { month: '2025-01', count: 2 },
  { month: '2024-12', count: 4 },
  { month: '2024-11', count: 1 },
  { month: '2024-10', count: 3 },
  { month: '2024-09', count: 2 },
  { month: '2024-08', count: 1 },
  { month: '2024-07', count: 2 },
  { month: '2024-06', count: 5 },
  { month: '2024-05', count: 2 },
  { month: '2024-04', count: 1 },
  { month: '2024-03', count: 3 },
  { month: '2024-02', count: 2 },
]

export const mockCurrentPR = mockPRMentions[0]

// -----------------------------------------------------------------------------
// HEALTH SCORE
// -----------------------------------------------------------------------------

export const mockHealthScore: HealthScore = {
  overallScore: 93.06,
  ebitdaAdjustment: 0,
  trend: [88.2, 91.4, 89.8, 92.1, 90.5, 93.2, 91.8, 94.3, 92.7, 93.8, 91.2, 93.06],
  breakdown: [
    {
      metric: 'Total Sales',
      weight: 30,
      actual: 507855,
      target: 567694,
      score: 89.46,
      weightedScore: 26.84,
    },
    {
      metric: 'Prime Cost',
      weight: 25,
      actual: 59.98,
      target: 60,
      score: 100.03, // Lower is better, so at target = 100%
      weightedScore: 25.01,
    },
    {
      metric: 'Food Sales',
      weight: 20.4,
      actual: 301156,
      target: 340616,
      score: 88.41,
      weightedScore: 18.04,
    },
    {
      metric: 'Food Costs',
      weight: 15,
      actual: 32.01,
      target: 32,
      score: 99.97,
      weightedScore: 15.00,
    },
    {
      metric: 'Labor Costs',
      weight: 15,
      actual: 28.01,
      target: 28,
      score: 99.96,
      weightedScore: 15.00,
    },
    {
      metric: 'Wine Sales',
      weight: 5.7,
      actual: 41892,
      target: 45415,
      score: 92.24,
      weightedScore: 5.26,
    },
    {
      metric: 'PPA',
      weight: 5,
      actual: 58.23,
      target: 57,
      score: 102.16,
      weightedScore: 5.11,
    },
    {
      metric: 'Customer Loyalty',
      weight: 5,
      actual: 13.2,
      target: 15,
      score: 88.00,
      weightedScore: 4.40,
    },
    {
      metric: 'Alcohol Sales',
      weight: 3.6,
      actual: 52311,
      target: 56769,
      score: 92.15,
      weightedScore: 3.32,
    },
    {
      metric: 'Reviews',
      weight: 2,
      actual: 4.3,
      target: 4.5,
      score: 95.56,
      weightedScore: 1.91,
    },
    {
      metric: 'PR Mentions',
      weight: 2,
      actual: 2,
      target: 3,
      score: 66.67,
      weightedScore: 1.33,
    },
    {
      metric: 'Website Visibility',
      weight: 1,
      actual: 32.63,
      target: 35,
      score: 93.23,
      weightedScore: 0.93,
    },
    {
      metric: 'Beer Sales',
      weight: 0.3,
      actual: 14203,
      target: 17030,
      score: 83.40,
      weightedScore: 0.25,
    },
  ],
}

// -----------------------------------------------------------------------------
// CHART DATA (Pre-formatted for charts)
// -----------------------------------------------------------------------------

// Total Sales - Comparative Bar Chart
export const mockTotalSalesChart = [
  { label: '2025 Actual', value: 507855, isTarget: false, year: 2025 },
  { label: '2025 Target', value: 567694, isTarget: true },
  { label: '2024 Actual', value: 489234, isTarget: false, year: 2024 },
  { label: '2023 Actual', value: 456789, isTarget: false, year: 2023 },
]

// Food Sales - Comparative Bar Chart
export const mockFoodSalesChart = [
  { label: '2025 Actual', value: 301156, isTarget: false, year: 2025 },
  { label: '2025 Target', value: 340616, isTarget: true },
  { label: '2024 Actual', value: 290123, isTarget: false, year: 2024 },
  { label: '2023 Actual', value: 271234, isTarget: false, year: 2023 },
]

// Beverage Sales - Stacked Bar Chart
export const mockBeverageSalesChart = [
  {
    label: '2025 Target',
    alcohol: 56769,
    beer: 17030,
    wine: 45415,
  },
  {
    label: '2025 Actual',
    alcohol: 52311,
    beer: 14203,
    wine: 41892,
  },
  {
    label: '2024 Actual',
    alcohol: 49876,
    beer: 13987,
    wine: 39876,
  },
  {
    label: '2023 Actual',
    alcohol: 46234,
    beer: 12987,
    wine: 36876,
  },
]

export const mockBeverageSegments = [
  { key: 'alcohol', label: 'Alcohol (Spirits)', color: 'hsl(239, 84%, 67%)' },
  { key: 'beer', label: 'Beer', color: 'hsl(187, 92%, 43%)' },
  { key: 'wine', label: 'Wine', color: 'hsl(262, 83%, 58%)' },
]

// Customer Loyalty - Stacked Bar Chart
export const mockLoyaltyChart = [
  {
    label: 'Target',
    oneVisit: 5000,
    twoToNine: 2500,
    tenPlus: 750,
  },
  {
    label: '2025 Actual',
    oneVisit: 5234,
    twoToNine: 2876,
    tenPlus: 611,
  },
  {
    label: '2024 Actual',
    oneVisit: 5123,
    twoToNine: 2701,
    tenPlus: 588,
  },
]

export const mockLoyaltySegments = [
  { key: 'oneVisit', label: '1 Visit', color: 'hsl(38, 92%, 50%)' },
  { key: 'twoToNine', label: '2-9 Visits', color: 'hsl(160, 84%, 39%)' },
  { key: 'tenPlus', label: '10+ Visits', color: 'hsl(239, 84%, 67%)' },
]

// Prime Cost - Line Chart (Time Series)
export const mockPrimeCostTrend = mockMonthlyMetrics.map(m => ({
  date: m.month,
  value: m.primeCost,
})).reverse()

// Website Visibility - Line Chart (Time Series)
export const mockVisibilityTrend = mockWebsiteVisibility.map(v => ({
  date: v.month,
  value: v.visibilityPercent,
})).reverse()

// PR Mentions - Bar Chart (Time Series)
export const mockPRMentionsTrend = mockPRMentions.map(p => ({
  date: p.month,
  value: p.count,
})).reverse()

// Review Breakdown - Stacked Bar (negative reviews)
export const mockReviewBreakdownChart = mockReviewMetrics.slice(0, 6).map(r => ({
  date: r.month,
  oneStar: r.oneStarCount,
  twoStar: r.twoStarCount,
  threeStar: r.threeStarCount,
})).reverse()

export const mockReviewSegments = [
  { key: 'oneStar', label: '1 Star', color: 'hsl(0, 84%, 60%)' },
  { key: 'twoStar', label: '2 Star', color: 'hsl(38, 92%, 50%)' },
  { key: 'threeStar', label: '3 Star', color: 'hsl(48, 96%, 53%)' },
]

// -----------------------------------------------------------------------------
// AI INSIGHTS (Pro Plan)
// -----------------------------------------------------------------------------

export const mockAIInsight = {
  month: '2025-01',
  generatedAt: '2025-01-15T10:30:00Z',
  content: `## January 2025 Performance Summary

### Overall Assessment
Your restaurant achieved a **93.06 health score** this month, indicating strong overall performance with some areas for improvement. Total sales of $507,855 came in at 89.5% of target, while cost management remained excellent with prime costs at 59.98%.

### Key Wins
- **Prime cost control** is exceptional at 59.98%, just under your 60% target
- **PPA increased** to $58.23, exceeding the $57 target by 2.2%
- **Website visibility** grew to 32.63%, up from 21.12% a year ago

### Areas of Concern
- **Total sales** missed target by $59,839 (10.5% gap)
- **Customer loyalty** at 13.2% is below the 15% target
- **PR mentions** were light with only 2 this month vs. target of 3

### Top 3 Recommendations
1. **Launch a loyalty program promotion** to boost repeat visits - consider a "5th visit free appetizer" offer to push more customers into the 3+ visit category
2. **Focus on weekday dinner service** where you have capacity - your RevPASH data suggests opportunity in Tuesday-Thursday evenings
3. **Pitch seasonal menu story** to local food media - your February menu launch is a perfect PR hook to hit your mention targets`,
}

// -----------------------------------------------------------------------------
// INTEGRATIONS STATUS
// -----------------------------------------------------------------------------

export const mockIntegrations = [
  {
    id: 'int_01',
    type: 'TOAST',
    name: 'Toast POS',
    status: 'CONNECTED' as const,
    lastSyncAt: '2025-01-24T06:00:00Z',
    logo: '/integrations/toast.svg',
  },
  {
    id: 'int_02',
    type: 'OPENTABLE',
    name: 'OpenTable',
    status: 'CONNECTED' as const,
    lastSyncAt: '2025-01-24T06:00:00Z',
    logo: '/integrations/opentable.svg',
  },
  {
    id: 'int_03',
    type: 'BRIGHTLOCAL',
    name: 'BrightLocal',
    status: 'CONNECTED' as const,
    lastSyncAt: '2025-01-23T12:00:00Z',
    logo: '/integrations/brightlocal.svg',
  },
  {
    id: 'int_04',
    type: 'SEMRUSH',
    name: 'SEMRush',
    status: 'ERROR' as const,
    lastSyncAt: '2025-01-20T06:00:00Z',
    lastError: 'API rate limit exceeded',
    logo: '/integrations/semrush.svg',
  },
  {
    id: 'int_05',
    type: 'R365',
    name: 'Restaurant 365',
    status: 'DISCONNECTED' as const,
    lastSyncAt: null,
    logo: '/integrations/r365.svg',
  },
]

// -----------------------------------------------------------------------------
// NAVIGATION ITEMS
// -----------------------------------------------------------------------------

export const mockNavItems = [
  { name: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { name: 'Health Score', href: '/health-score', icon: 'Target' },
  { name: 'Trends', href: '/trends', icon: 'TrendingUp' },
  { type: 'separator', label: 'Operations' },
  { name: 'Sales', href: '/sales', icon: 'DollarSign' },
  { name: 'Costs', href: '/costs', icon: 'Receipt' },
  { name: 'Customers', href: '/customers', icon: 'Users' },
  { type: 'separator', label: 'Marketing' },
  { name: 'Reviews', href: '/reviews', icon: 'Star' },
  { name: 'Visibility', href: '/visibility', icon: 'Search' },
  { name: 'PR', href: '/pr', icon: 'Newspaper' },
]

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

export function formatMonth(monthStr: string): string {
  const date = new Date(monthStr + '-01')
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function getHealthColor(score: number): string {
  if (score >= 100) return 'text-health-excellent'
  if (score >= 90) return 'text-health-good'
  if (score >= 80) return 'text-health-warning'
  return 'text-health-danger'
}

export function getHealthBgColor(score: number): string {
  if (score >= 100) return 'bg-health-excellent'
  if (score >= 90) return 'bg-health-good'
  if (score >= 80) return 'bg-health-warning'
  return 'bg-health-danger'
}
