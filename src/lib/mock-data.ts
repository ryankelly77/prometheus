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
  trend: number[]
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
    name: 'Brasserie Mon Chou Chou',
    totalSeats: 120,
    cuisineType: 'FRENCH',
    timezone: 'America/Chicago',
  },
  {
    id: 'loc_04',
    name: 'BoilerHouse',
    totalSeats: 200,
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
    totalSales: 612450,
    foodSales: 362800,
    alcoholSales: 63500,
    beerSales: 18100,
    wineSales: 50200,
    laborCosts: 165362,
    foodCosts: 189860,
    totalCustomers: 10245,
    ppa: 59.78,
    primeCost: 57.98,
    revPash: 14.76,
  },
  {
    month: '2024-11',
    totalSales: 489320,
    foodSales: 290100,
    alcoholSales: 49500,
    beerSales: 13900,
    wineSales: 39800,
    laborCosts: 137010,
    foodCosts: 156582,
    totalCustomers: 8390,
    ppa: 58.32,
    primeCost: 60.01,
    revPash: 11.79,
  },
  {
    month: '2024-10',
    totalSales: 562180,
    foodSales: 333450,
    alcoholSales: 56800,
    beerSales: 16100,
    wineSales: 45600,
    laborCosts: 157410,
    foodCosts: 176044,
    totalCustomers: 9612,
    ppa: 58.49,
    primeCost: 59.31,
    revPash: 13.54,
  },
  {
    month: '2024-09',
    totalSales: 445670,
    foodSales: 264200,
    alcoholSales: 45100,
    beerSales: 12700,
    wineSales: 36200,
    laborCosts: 129245,
    foodCosts: 142614,
    totalCustomers: 7650,
    ppa: 58.26,
    primeCost: 60.98,
    revPash: 10.73,
  },
  {
    month: '2024-08',
    totalSales: 534890,
    foodSales: 317200,
    alcoholSales: 54100,
    beerSales: 15300,
    wineSales: 43400,
    laborCosts: 149769,
    foodCosts: 168090,
    totalCustomers: 9178,
    ppa: 58.28,
    primeCost: 59.41,
    revPash: 12.88,
  },
  {
    month: '2024-07',
    totalSales: 478230,
    foodSales: 283600,
    alcoholSales: 48400,
    beerSales: 13600,
    wineSales: 38700,
    laborCosts: 138687,
    foodCosts: 153034,
    totalCustomers: 8205,
    ppa: 58.29,
    primeCost: 61.02,
    revPash: 11.52,
  },
  {
    month: '2024-06',
    totalSales: 598450,
    foodSales: 354700,
    alcoholSales: 60500,
    beerSales: 17100,
    wineSales: 48500,
    laborCosts: 167566,
    foodCosts: 185519,
    totalCustomers: 10267,
    ppa: 58.29,
    primeCost: 58.99,
    revPash: 14.41,
  },
  {
    month: '2024-05',
    totalSales: 467890,
    foodSales: 277300,
    alcoholSales: 47300,
    beerSales: 13300,
    wineSales: 37900,
    laborCosts: 135088,
    foodCosts: 149725,
    totalCustomers: 8023,
    ppa: 58.32,
    primeCost: 60.88,
    revPash: 11.27,
  },
  {
    month: '2024-04',
    totalSales: 545670,
    foodSales: 323500,
    alcoholSales: 55200,
    beerSales: 15600,
    wineSales: 44200,
    laborCosts: 152788,
    foodCosts: 171524,
    totalCustomers: 9356,
    ppa: 58.32,
    primeCost: 59.44,
    revPash: 13.14,
  },
  {
    month: '2024-03',
    totalSales: 489340,
    foodSales: 290100,
    alcoholSales: 49500,
    beerSales: 13900,
    wineSales: 39600,
    laborCosts: 141508,
    foodCosts: 156589,
    totalCustomers: 8392,
    ppa: 58.31,
    primeCost: 60.92,
    revPash: 11.78,
  },
  {
    month: '2024-02',
    totalSales: 423560,
    foodSales: 251100,
    alcoholSales: 42800,
    beerSales: 12000,
    wineSales: 34300,
    laborCosts: 126645,
    foodCosts: 139174,
    totalCustomers: 7267,
    ppa: 58.28,
    primeCost: 62.78,
    revPash: 10.20,
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
  overallScore: 91.24,
  ebitdaAdjustment: 0,
  trend: [85.3, 92.1, 88.4, 94.7, 86.2, 91.8, 89.5, 95.2, 87.6, 93.4, 90.1, 91.24],
  breakdown: [
    // Sales Performance (50 pts total)
    {
      metric: 'Total Sales',
      weight: 25,
      actual: 507855,
      target: 567694,
      score: 89.46,
      weightedScore: 22.37,
      trend: [82.3, 87.5, 91.2, 85.8, 93.4, 88.1, 86.7, 94.2, 89.8, 92.1, 87.3, 89.46],
    },
    {
      metric: 'Food Sales',
      weight: 10,
      actual: 301156,
      target: 340616,
      score: 88.41,
      weightedScore: 8.84,
      trend: [84.2, 89.7, 86.3, 91.5, 87.8, 93.2, 85.4, 90.1, 88.6, 92.8, 86.9, 88.41],
    },
    {
      metric: 'Alcohol Sales',
      weight: 5,
      actual: 52311,
      target: 56769,
      score: 92.15,
      weightedScore: 4.61,
      trend: [87.6, 93.8, 90.2, 95.4, 88.9, 94.1, 91.7, 96.2, 89.5, 93.3, 90.8, 92.15],
    },
    {
      metric: 'Wine Sales',
      weight: 5,
      actual: 41892,
      target: 45415,
      score: 92.24,
      weightedScore: 4.61,
      trend: [88.4, 94.7, 91.2, 96.3, 89.8, 93.5, 87.6, 95.1, 90.4, 94.8, 88.9, 92.24],
    },
    {
      metric: 'Beer Sales',
      weight: 2,
      actual: 14203,
      target: 17030,
      score: 83.40,
      weightedScore: 1.67,
      trend: [76.2, 82.5, 79.1, 85.8, 77.4, 84.2, 80.6, 86.9, 78.3, 83.7, 81.5, 83.40],
    },
    {
      metric: 'RevPASH',
      weight: 3,
      actual: 3576.44,
      target: 4200,
      score: 85.15,
      weightedScore: 2.55,
      trend: [3200, 4100, 3500, 4400, 3100, 4200, 3400, 4600, 3300, 4500, 3200, 3576],
    },
    // Cost Management (35 pts total)
    {
      metric: 'Prime Cost',
      weight: 15,
      actual: 59.98,
      target: 60,
      score: 100.03,
      weightedScore: 15.00,
      trend: [65.2, 57.8, 62.4, 55.9, 64.1, 58.3, 56.2, 63.8, 57.1, 64.9, 56.8, 59.98],
    },
    {
      metric: 'Labor Costs',
      weight: 10,
      actual: 28.01,
      target: 28,
      score: 99.96,
      weightedScore: 10.00,
      trend: [31.2, 27.4, 29.8, 26.1, 30.5, 27.9, 32.1, 26.8, 29.2, 31.8, 27.1, 28.01],
    },
    {
      metric: 'Food Costs',
      weight: 8,
      actual: 32.01,
      target: 32,
      score: 99.97,
      weightedScore: 8.00,
      trend: [34.8, 30.2, 33.1, 29.5, 35.2, 31.4, 28.9, 33.8, 30.1, 34.5, 29.8, 32.01],
    },
    {
      metric: 'Beverage Costs',
      weight: 2,
      actual: 22.5,
      target: 24,
      score: 106.67,
      weightedScore: 2.00,
      trend: [26.1, 20.8, 24.5, 19.2, 25.8, 21.3, 18.9, 24.2, 20.1, 25.4, 19.8, 22.5],
    },
    // Customer Insights (10 pts total)
    {
      metric: 'Customer Loyalty',
      weight: 5,
      actual: 13.2,
      target: 15,
      score: 88.00,
      weightedScore: 4.40,
      trend: [10.8, 14.2, 11.5, 15.1, 12.3, 14.8, 10.9, 13.9, 11.2, 15.4, 12.6, 13.2],
    },
    {
      metric: 'Reviews',
      weight: 3,
      actual: 4.3,
      target: 4.5,
      score: 95.56,
      weightedScore: 2.87,
      trend: [4.1, 4.5, 4.2, 4.6, 4.0, 4.4, 4.2, 4.5, 4.1, 4.6, 4.2, 4.3],
    },
    {
      metric: 'PPA',
      weight: 2,
      actual: 58.23,
      target: 57,
      score: 102.16,
      weightedScore: 2.00,
      trend: [99.8, 103.2, 101.5, 98.7, 104.1, 100.9, 102.8, 99.3, 103.7, 101.2, 100.5, 102.16],
    },
    // Marketing & Visibility (5 pts total)
    {
      metric: 'Website Visibility',
      weight: 3,
      actual: 32.63,
      target: 35,
      score: 93.23,
      weightedScore: 2.80,
      trend: [18.5, 24.2, 20.1, 27.8, 22.4, 29.5, 24.8, 31.2, 26.9, 34.1, 28.7, 32.63],
    },
    {
      metric: 'PR Mentions',
      weight: 2,
      actual: 2,
      target: 3,
      score: 66.67,
      weightedScore: 1.33,
      trend: [33.3, 100.0, 66.7, 133.3, 33.3, 66.7, 100.0, 33.3, 100.0, 66.7, 33.3, 66.67],
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
    label: '2025 Actual',
    alcohol: 52311,
    beer: 14203,
    wine: 41892,
  },
  {
    label: '2025 Target',
    alcohol: 56769,
    beer: 17030,
    wine: 45415,
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
  { key: 'alcohol', label: 'Alcohol (Spirits)', color: '#FF6B6B' },  // Bright coral red
  { key: 'beer', label: 'Beer', color: '#4ECDC4' },                   // Bright teal
  { key: 'wine', label: 'Wine', color: '#9B59B6' },                   // Bright purple
]

// Customer Loyalty - Horizontal Stacked Bar Chart (percentages)
// Target: 3-9 visits + 10+ visits = 15% combined
export const mockLoyaltyChart = [
  {
    label: '2025 Actual',
    oneToTwo: 86.8,
    threeToNine: 9.2,
    tenPlus: 4.0,
  },
  {
    label: '2024 Actual',
    oneToTwo: 87.5,
    threeToNine: 8.8,
    tenPlus: 3.7,
  },
]

export const mockLoyaltySegments = [
  { key: 'tenPlus', label: '10+ Visits', color: '#16A249' },       // Dark green
  { key: 'threeToNine', label: '3-9 Visits', color: '#82CB15' },   // Lighter green
  { key: 'oneToTwo', label: '1-2 Visits', color: '#F59E0B' },      // Yellow/orange
]

// Prime Cost - Line Chart (Time Series)
export const mockPrimeCostTrend = mockMonthlyMetrics.map(m => ({
  date: m.month,
  value: m.primeCost,
})).reverse()

// RevPASH - Line Chart (12-month Time Series)
export const mockRevPashTrend = [
  { date: '2024-02', value: 4486.51 },
  { date: '2024-03', value: 4885.35 },
  { date: '2024-04', value: 4499.12 },
  { date: '2024-05', value: 4687.28 },
  { date: '2024-06', value: 4377.70 },
  { date: '2024-07', value: 4168.82 },
  { date: '2024-08', value: 4220.64 },
  { date: '2024-09', value: 3755.33 },
  { date: '2024-10', value: 4465.83 },
  { date: '2024-11', value: 4741.28 },
  { date: '2024-12', value: 5473.67 },
  { date: '2025-01', value: 4159.42 },
]

// Website Visibility - Line Chart (Time Series)
export const mockVisibilityTrend = mockWebsiteVisibility.map(v => ({
  date: v.month,
  value: v.visibilityPercent,
})).reverse()

// AI Visibility - Line Chart (Time Series) - Premium Feature
export const mockAIVisibilityTrend = [
  { date: '2024-02', value: 12.3 },
  { date: '2024-03', value: 14.8 },
  { date: '2024-04', value: 18.2 },
  { date: '2024-05', value: 22.5 },
  { date: '2024-06', value: 28.1 },
  { date: '2024-07', value: 31.4 },
  { date: '2024-08', value: 35.8 },
  { date: '2024-09', value: 38.2 },
  { date: '2024-10', value: 42.6 },
  { date: '2024-11', value: 45.9 },
  { date: '2024-12', value: 48.3 },
  { date: '2025-01', value: 52.7 },
]

// Labor Costs - Comparative Bar Chart (percentages, lower is better)
export const mockLaborCostsChart = [
  { label: '2025 Actual', value: 28.01, isTarget: false, year: 2025 },
  { label: '2025 Target', value: 28, isTarget: true },
  { label: '2024 Actual', value: 29.00, isTarget: false, year: 2024 },
  { label: '2023 Actual', value: 29.90, isTarget: false, year: 2023 },
]

// Food Costs - Comparative Bar Chart (percentages, lower is better)
export const mockFoodCostsChart = [
  { label: '2025 Actual', value: 32.01, isTarget: false, year: 2025 },
  { label: '2025 Target', value: 32, isTarget: true },
  { label: '2024 Actual', value: 32.56, isTarget: false, year: 2024 },
  { label: '2023 Actual', value: 33.00, isTarget: false, year: 2023 },
]

// Prime Cost - Comparative Bar Chart (percentages, lower is better)
export const mockPrimeCostChart = [
  { label: '2025 Actual', value: 59.98, isTarget: false, year: 2025 },
  { label: '2025 Target', value: 60, isTarget: true },
  { label: '2024 Actual', value: 61.56, isTarget: false, year: 2024 },
  { label: '2023 Actual', value: 62.90, isTarget: false, year: 2023 },
]

// PR Mentions - Bar Chart (Time Series) - 12 months
export const mockPRMentionsTrend = [
  { date: 'Oct', value: 4 },
  { date: 'Nov', value: 0 },
  { date: 'Dec', value: 8 },
  { date: 'Jan', value: 6 },
  { date: 'Feb', value: 5 },
  { date: 'Mar', value: 14 },
  { date: 'Apr', value: 5 },
  { date: 'May', value: 6 },
  { date: 'Jun', value: 13 },
  { date: 'Jul', value: 4 },
  { date: 'Aug', value: 7 },
  { date: 'Sep', value: 9 },
]

// Review Breakdown - Stacked Bar (negative reviews) - 12 months
export const mockReviewBreakdownChart = [
  { date: 'Oct', oneStar: 2, twoStar: 1, threeStar: 5 },
  { date: 'Nov', oneStar: 1, twoStar: 2, threeStar: 6 },
  { date: 'Dec', oneStar: 2, twoStar: 1, threeStar: 6 },
  { date: 'Jan', oneStar: 2, twoStar: 3, threeStar: 5 },
  { date: 'Feb', oneStar: 1, twoStar: 1, threeStar: 2 },
  { date: 'Mar', oneStar: 2, twoStar: 2, threeStar: 5 },
  { date: 'Apr', oneStar: 1, twoStar: 1, threeStar: 6 },
  { date: 'May', oneStar: 2, twoStar: 2, threeStar: 4 },
  { date: 'Jun', oneStar: 3, twoStar: 2, threeStar: 4 },
  { date: 'Jul', oneStar: 1, twoStar: 1, threeStar: 2 },
  { date: 'Aug', oneStar: 1, twoStar: 1, threeStar: 2 },
  { date: 'Sep', oneStar: 1, twoStar: 1, threeStar: 2 },
]

export const mockReviewSegments = [
  { key: 'oneStar', label: '1 Star', color: '#3B82F6' },   // Blue
  { key: 'twoStar', label: '2 Star', color: '#EF4444' },   // Red
  { key: 'threeStar', label: '3 Star', color: '#F59E0B' }, // Yellow/Amber
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

// -----------------------------------------------------------------------------
// CUSTOMER / GUEST DATA
// -----------------------------------------------------------------------------

export interface Guest {
  id: string
  name: string
  email: string
  phone?: string
  lastVisitDate: string
  lastVisitTime: string
  visitsThisPeriod: number
  coversThisPeriod: number
  totalSpendThisPeriod: number
  lifetimeVisits: number
  lifetimeCovers: number
  lifetimeTotalSpend: number
  tags: string[]
}

// Generate realistic guest data
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
  'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael',
  'Emily', 'Daniel', 'Elizabeth', 'Matthew', 'Sofia', 'Jackson', 'Avery',
  'Sebastian', 'Ella', 'David', 'Scarlett', 'Joseph', 'Grace', 'Samuel',
  'Chloe', 'Carter', 'Victoria', 'Owen', 'Riley', 'Wyatt', 'Aria', 'John',
  'Lily', 'Jack', 'Aurora', 'Luke', 'Zoey', 'Gabriel', 'Penelope', 'Anthony',
  'Layla', 'Isaac', 'Nora', 'Dylan', 'Camila', 'Leo', 'Hannah', 'Lincoln',
  'Addison', 'Jaxon', 'Eleanor', 'Asher', 'Stella', 'Christopher', 'Bella',
  'Josiah', 'Lucy', 'Andrew', 'Paisley', 'Thomas', 'Savannah', 'Joshua'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Chen', 'Kim', 'Patel', 'Murphy', 'Sullivan'
]

const guestTags = ['VIP', 'Regular', 'Birthday', 'Anniversary', 'Wine Club', 'Allergies', 'Gluten-Free', 'Vegetarian', 'Corporate', 'Celebration', 'First-Timer', 'Influencer', 'Local', 'Tourist', 'Brunch Regular']

function generateGuests(): Guest[] {
  const guests: Guest[] = []

  for (let i = 0; i < 75; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]

    // Determine guest type (affects visit frequency and spend)
    const guestType = Math.random()
    let lifetimeVisits: number
    let avgSpendPerVisit: number
    let tags: string[] = []

    if (guestType < 0.15) {
      // VIP (10+ visits) - 15%
      lifetimeVisits = Math.floor(Math.random() * 30) + 10
      avgSpendPerVisit = 150 + Math.random() * 200
      tags.push('VIP')
      if (Math.random() > 0.5) tags.push('Regular')
      if (Math.random() > 0.7) tags.push('Wine Club')
    } else if (guestType < 0.45) {
      // Regular (2-9 visits) - 30%
      lifetimeVisits = Math.floor(Math.random() * 8) + 2
      avgSpendPerVisit = 80 + Math.random() * 100
      if (Math.random() > 0.6) tags.push('Regular')
    } else {
      // First-timer (1 visit) - 55%
      lifetimeVisits = 1
      avgSpendPerVisit = 50 + Math.random() * 80
      if (Math.random() > 0.7) tags.push('First-Timer')
    }

    // Add random additional tags
    const additionalTagsCount = Math.floor(Math.random() * 2)
    for (let t = 0; t < additionalTagsCount; t++) {
      const randomTag = guestTags[Math.floor(Math.random() * guestTags.length)]
      if (!tags.includes(randomTag)) {
        tags.push(randomTag)
      }
    }

    // Calculate covers and spend
    const avgCoversPerVisit = 1.5 + Math.random() * 2.5
    const lifetimeCovers = Math.round(lifetimeVisits * avgCoversPerVisit)
    const lifetimeTotalSpend = Math.round(lifetimeVisits * avgSpendPerVisit * avgCoversPerVisit)

    // This period (Jan 2025) - some guests haven't visited
    const visitedThisPeriod = Math.random() > 0.3
    const visitsThisPeriod = visitedThisPeriod ? Math.min(lifetimeVisits, Math.floor(Math.random() * 3) + 1) : 0
    const coversThisPeriod = visitsThisPeriod > 0 ? Math.round(visitsThisPeriod * avgCoversPerVisit) : 0
    const totalSpendThisPeriod = visitsThisPeriod > 0 ? Math.round(visitsThisPeriod * avgSpendPerVisit * avgCoversPerVisit) : 0

    // Generate last visit date (within last 90 days for active, older for inactive)
    const daysAgo = visitedThisPeriod
      ? Math.floor(Math.random() * 25) + 1  // Within January
      : Math.floor(Math.random() * 180) + 30 // 1-6 months ago

    const lastVisitDate = new Date('2025-01-25')
    lastVisitDate.setDate(lastVisitDate.getDate() - daysAgo)

    // Generate random time
    const hours = Math.floor(Math.random() * 8) + 11 // 11 AM - 7 PM
    const minutes = Math.floor(Math.random() * 4) * 15 // 0, 15, 30, 45
    const timeStr = `${hours > 12 ? hours - 12 : hours}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`

    guests.push({
      id: `guest_${(i + 1).toString().padStart(3, '0')}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      phone: Math.random() > 0.3 ? `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}` : undefined,
      lastVisitDate: lastVisitDate.toISOString().split('T')[0],
      lastVisitTime: timeStr,
      visitsThisPeriod,
      coversThisPeriod,
      totalSpendThisPeriod,
      lifetimeVisits,
      lifetimeCovers,
      lifetimeTotalSpend,
      tags,
    })
  }

  // Sort by last visit date descending
  guests.sort((a, b) => new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime())

  return guests
}

export const mockGuests = generateGuests()

// Customer summary stats for current period
export const mockCustomerStats = {
  totalCustomers: mockCurrentMetrics.totalCustomers,
  ppa: mockCurrentMetrics.ppa,
  loyaltyPercent: mockCurrentLoyalty.percentThreePlus,
  revPash: mockCurrentMetrics.revPash,
  // Changes from prior year
  priorYearCustomers: mockPriorYearMetrics.totalCustomers,
  priorYearPPA: mockPriorYearMetrics.ppa,
  priorYearLoyalty: 12.5,
  priorYearRevPash: mockPriorYearMetrics.revPash,
}

// Customer Loyalty Stacked Bar Chart Data (visit frequency breakdown)
export const mockCustomerLoyaltyChart = [
  {
    label: '2025 Actual',
    oneVisit: 5234,
    twoToNine: 2876,
    tenPlus: 611,
  },
  {
    label: '2025 Target',
    oneVisit: 5500,
    twoToNine: 2800,
    tenPlus: 700,
  },
  {
    label: '2024 Actual',
    oneVisit: 5456,
    twoToNine: 2745,
    tenPlus: 541,
  },
]

export const mockCustomerLoyaltySegments = [
  { key: 'tenPlus', label: '10+ Visits', color: '#16A249' },      // Green - most loyal
  { key: 'twoToNine', label: '2-9 Visits', color: '#82CB15' },    // Lime - regular
  { key: 'oneVisit', label: '1 Visit', color: '#94A3B8' },        // Gray - first-timers
]

// PPA Chart Data (reusing from sales, but declaring for clarity)
export const mockPPAChart = [
  { label: '2025 Actual', value: 58.23, isTarget: false, year: 2025 },
  { label: '2025 Target', value: 57, isTarget: true },
  { label: '2024 Actual', value: 58.16, isTarget: false, year: 2024 },
  { label: '2023 Actual', value: 58.14, isTarget: false, year: 2023 },
]

// RevPASH Chart Data
export const mockRevPASHChart = [
  { label: '2025 Actual', value: 12.43, isTarget: false, year: 2025 },
  { label: '2025 Target', value: 14.00, isTarget: true },
  { label: '2024 Actual', value: 11.78, isTarget: false, year: 2024 },
  { label: '2023 Actual', value: 10.99, isTarget: false, year: 2023 },
]

// Customer Loyalty % Trend (12 months)
export const mockLoyaltyTrend = [
  { date: '2024-02', value: 11.2 },
  { date: '2024-03', value: 11.5 },
  { date: '2024-04', value: 11.8 },
  { date: '2024-05', value: 12.1 },
  { date: '2024-06', value: 12.4 },
  { date: '2024-07', value: 12.5 },
  { date: '2024-08', value: 12.8 },
  { date: '2024-09', value: 13.0 },
  { date: '2024-10', value: 13.2 },
  { date: '2024-11', value: 13.5 },
  { date: '2024-12', value: 13.8 },
  { date: '2025-01', value: 13.2 },
]

// All unique guest tags (for filter dropdown)
export const mockGuestTags = Array.from(new Set(mockGuests.flatMap(g => g.tags))).sort()

// -----------------------------------------------------------------------------
// REVIEWS DATA
// -----------------------------------------------------------------------------

export type ReviewSource = 'Google' | 'Yelp' | 'Facebook' | 'TripAdvisor' | 'OpenTable'
export type ReviewStatus = 'Active' | 'Pending' | 'Flagged'

export interface Review {
  id: string
  datePosted: string
  source: ReviewSource
  rating: number
  reviewerName: string
  reviewText: string
  status: ReviewStatus
}

// Review text templates
const positiveReviews = [
  "Absolutely fantastic dining experience! The food was exquisite and the service impeccable. Will definitely be back!",
  "Best restaurant in San Antonio, hands down. The craft beer selection is incredible and pairs perfectly with their menu.",
  "We celebrated our anniversary here and it was perfect. The staff made us feel so special. Highly recommend!",
  "The brunch is to die for! Chicken and waffles were amazing. Great atmosphere and friendly staff.",
  "Outstanding food and cocktails. The bartender recommended the perfect wine pairing. Five stars!",
  "This place never disappoints. Consistent quality, great ambiance, and the happy hour deals are unbeatable.",
  "Came for a business dinner and was thoroughly impressed. Professional service and the private dining room was perfect.",
  "The new seasonal menu is incredible! Chef really outdid themselves. Every dish was a work of art.",
  "My go-to spot for date night. Romantic atmosphere, delicious food, and the wine list is extensive.",
  "First time here and wow! The ribeye was cooked to perfection. Already planning my next visit.",
  "Love the outdoor patio! Great for people watching while enjoying their amazing tacos and margaritas.",
  "The tasting menu was an incredible journey. Worth every penny for a special occasion.",
  "Friendly staff, quick service, and the portions are generous. Great value for the quality.",
  "The brewery tour was so much fun! Learned a lot and the beer flights were excellent.",
  "Perfect for a family gathering. Kids loved the mac and cheese, adults loved the cocktails!",
]

const neutralReviews = [
  "Good food but the wait was a bit long. Would come back on a less busy night.",
  "Solid restaurant, nothing extraordinary but definitely worth a visit. Service was average.",
  "The appetizers were better than the mains. Decent cocktails. Might try again.",
  "Nice atmosphere but a bit pricey for what you get. Food was good, not great.",
  "Had a nice time overall. Some dishes hit, some missed. Would give it another try.",
  "Good brunch spot. Coffee could be better. Eggs benedict was tasty.",
  "Pleasant experience. The burger was good but I've had better. Nice beer selection though.",
]

const negativeReviews = [
  "Disappointed with the service tonight. Had to wait 20 minutes just to get water. Food was okay.",
  "Way overpriced for mediocre food. The steak was overcooked and sides were cold.",
  "Unfortunately our experience was not great. Server forgot our order twice. Won't be returning.",
  "The food was fine but the noise level made it impossible to have a conversation.",
  "Expected more based on the reviews. Portions were small and service was slow.",
  "Had a reservation but still waited 30 minutes for a table. Very frustrating.",
  "The cocktails were weak and overpriced. Food took forever to arrive.",
  "Found a hair in my salad. Manager was apologetic but it really ruined the meal.",
]

const reviewerFirstNames = [
  'Mike', 'Sarah', 'John', 'Emily', 'David', 'Lisa', 'Chris', 'Amanda',
  'Brian', 'Jennifer', 'Kevin', 'Michelle', 'Jason', 'Ashley', 'Ryan',
  'Nicole', 'Matt', 'Stephanie', 'Josh', 'Lauren', 'Andrew', 'Rachel',
  'Daniel', 'Megan', 'Tom', 'Katie', 'Steve', 'Jessica', 'Mark', 'Heather'
]

const reviewerLastInitials = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'W']

function generateReviews(): Review[] {
  const reviews: Review[] = []
  const sources: ReviewSource[] = ['Google', 'Yelp', 'Facebook', 'TripAdvisor', 'OpenTable']
  const sourceWeights = [0.45, 0.25, 0.12, 0.10, 0.08] // Google dominates

  for (let i = 0; i < 85; i++) {
    // Determine source based on weights
    const sourceRand = Math.random()
    let source: ReviewSource = 'Google'
    let cumulative = 0
    for (let s = 0; s < sources.length; s++) {
      cumulative += sourceWeights[s]
      if (sourceRand < cumulative) {
        source = sources[s]
        break
      }
    }

    // Rating distribution: mostly 4-5 stars, some 3s, few 1-2s
    const ratingRand = Math.random()
    let rating: number
    if (ratingRand < 0.40) rating = 5
    else if (ratingRand < 0.75) rating = 4
    else if (ratingRand < 0.88) rating = 3
    else if (ratingRand < 0.95) rating = 2
    else rating = 1

    // Pick review text based on rating
    let reviewText: string
    if (rating >= 4) {
      reviewText = positiveReviews[Math.floor(Math.random() * positiveReviews.length)]
    } else if (rating === 3) {
      reviewText = neutralReviews[Math.floor(Math.random() * neutralReviews.length)]
    } else {
      reviewText = negativeReviews[Math.floor(Math.random() * negativeReviews.length)]
    }

    // Generate date within last 6 months
    const daysAgo = Math.floor(Math.random() * 180) + 1
    const date = new Date('2025-01-25')
    date.setDate(date.getDate() - daysAgo)

    // Status - most active, some pending
    const status: ReviewStatus = Math.random() > 0.92 ? 'Pending' : 'Active'

    const firstName = reviewerFirstNames[Math.floor(Math.random() * reviewerFirstNames.length)]
    const lastInitial = reviewerLastInitials[Math.floor(Math.random() * reviewerLastInitials.length)]

    reviews.push({
      id: `review_${(i + 1).toString().padStart(3, '0')}`,
      datePosted: date.toISOString().split('T')[0],
      source,
      rating,
      reviewerName: `${firstName} ${lastInitial}.`,
      reviewText,
      status,
    })
  }

  // Sort by date descending
  reviews.sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime())

  return reviews
}

export const mockReviews = generateReviews()

// Review summary stats
export const mockReviewStats = {
  totalReviews: mockCurrentReviews.totalCount,
  averageRating: mockCurrentReviews.averageRating,
  newReviewsThisPeriod: mockCurrentReviews.newReviewsCount,
  negativeReviews: mockCurrentReviews.oneStarCount + mockCurrentReviews.twoStarCount + mockCurrentReviews.threeStarCount,
  // Prior year comparison
  priorYearAvgRating: 4.2,
  priorYearNewReviews: 28,
  priorYearNegative: 8,
}

// Average Rating Comparative Bar Chart (legacy)
export const mockAvgRatingChart = [
  { label: '2025 Actual', value: 4.3, isTarget: false, year: 2025 },
  { label: '2025 Target', value: 4.5, isTarget: true },
  { label: '2024 Actual', value: 4.2, isTarget: false, year: 2024 },
  { label: '2023 Actual', value: 4.1, isTarget: false, year: 2023 },
]

// Cumulative Average Rating (monthly with total reviews)
export const mockCumulativeRatingChart = [
  // 2024 data (prior year)
  { month: "Feb '24", avgRating: 4.02, totalReviews: 542, newReviews: 22 },
  { month: "Mar '24", avgRating: 4.05, totalReviews: 568, newReviews: 26 },
  { month: "Apr '24", avgRating: 4.04, totalReviews: 596, newReviews: 28 },
  { month: "May '24", avgRating: 4.06, totalReviews: 628, newReviews: 32 },
  { month: "Jun '24", avgRating: 4.08, totalReviews: 663, newReviews: 35 },
  { month: "Jul '24", avgRating: 4.10, totalReviews: 701, newReviews: 38 },
  { month: "Aug '24", avgRating: 4.09, totalReviews: 732, newReviews: 31 },
  { month: "Sep '24", avgRating: 4.11, totalReviews: 760, newReviews: 28 },
  { month: "Oct '24", avgRating: 4.12, totalReviews: 792, newReviews: 32 },
  { month: "Nov '24", avgRating: 4.14, totalReviews: 830, newReviews: 38 },
  { month: "Dec '24", avgRating: 4.13, totalReviews: 862, newReviews: 32 },
  { month: "Jan '25", avgRating: 4.15, totalReviews: 892, newReviews: 30 },
  // 2025 data (current year)
  { month: "Feb '25", avgRating: 4.17, totalReviews: 920, newReviews: 28 },
  { month: "Mar '25", avgRating: 4.18, totalReviews: 952, newReviews: 32 },
  { month: "Apr '25", avgRating: 4.20, totalReviews: 987, newReviews: 35 },
  { month: "May '25", avgRating: 4.19, totalReviews: 1018, newReviews: 31 },
  { month: "Jun '25", avgRating: 4.22, totalReviews: 1054, newReviews: 36 },
  { month: "Jul '25", avgRating: 4.24, totalReviews: 1095, newReviews: 41 },
  { month: "Aug '25", avgRating: 4.26, totalReviews: 1126, newReviews: 31 },
  { month: "Sep '25", avgRating: 4.25, totalReviews: 1161, newReviews: 35 },
  { month: "Oct '25", avgRating: 4.27, totalReviews: 1199, newReviews: 38 },
  { month: "Nov '25", avgRating: 4.28, totalReviews: 1241, newReviews: 42 },
  { month: "Dec '25", avgRating: 4.32, totalReviews: 1275, newReviews: 34 },
  { month: "Jan '26", avgRating: 4.30, totalReviews: 1309, newReviews: 34 },
]

// Reviews by Rating Stacked Bar (monthly breakdown)
export const mockReviewsByRatingChart = [
  { month: 'Aug', oneStar: 1, twoStar: 1, threeStar: 4, fourStar: 14, fiveStar: 16 },
  { month: 'Sep', oneStar: 2, twoStar: 1, threeStar: 4, fourStar: 11, fiveStar: 13 },
  { month: 'Oct', oneStar: 1, twoStar: 2, threeStar: 5, fourStar: 14, fiveStar: 13 },
  { month: 'Nov', oneStar: 2, twoStar: 4, threeStar: 6, fourStar: 13, fiveStar: 13 },
  { month: 'Dec', oneStar: 1, twoStar: 2, threeStar: 4, fourStar: 15, fiveStar: 20 },
  { month: 'Jan', oneStar: 2, twoStar: 3, threeStar: 5, fourStar: 12, fiveStar: 12 },
]

export const mockRatingSegments = [
  { key: 'fiveStar', label: '5 Star', color: '#16A249' },
  { key: 'fourStar', label: '4 Star', color: '#82CB15' },
  { key: 'threeStar', label: '3 Star', color: '#F59E0B' },
  { key: 'twoStar', label: '2 Star', color: '#F97316' },
  { key: 'oneStar', label: '1 Star', color: '#EF4444' },
]

// Negative Reviews Trend (1-3 star per month)
export const mockNegativeReviewsTrend = [
  { date: '2024-02', value: 4 },
  { date: '2024-03', value: 9 },
  { date: '2024-04', value: 8 },
  { date: '2024-05', value: 8 },
  { date: '2024-06', value: 9 },
  { date: '2024-07', value: 4 },
  { date: '2024-08', value: 6 },
  { date: '2024-09', value: 7 },
  { date: '2024-10', value: 8 },
  { date: '2024-11', value: 12 },
  { date: '2024-12', value: 7 },
  { date: '2025-01', value: 10 },
]

// Reviews by Source (for donut chart)
export const mockReviewsBySource = [
  { name: 'Google', value: 562, color: '#4285F4' },      // Blue
  { name: 'Yelp', value: 312, color: '#D32323' },        // Red
  { name: 'Facebook', value: 186, color: '#A855F7' },    // Purple
  { name: 'TripAdvisor', value: 124, color: '#14B8A6' }, // Teal
  { name: 'OpenTable', value: 63, color: '#F59E0B' },    // Amber
]

// All unique review sources
export const mockReviewSources: ReviewSource[] = ['Google', 'Yelp', 'Facebook', 'TripAdvisor', 'OpenTable']
