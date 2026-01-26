// ============================================
// INTELLIGENCE MOCK DATA
// ============================================

import type {
  ReportDefinition,
  RecommendedReport,
  IntelligenceReportSummary,
  IntelligenceReport,
  UsageStats,
  ReportCategory,
} from '@/types/intelligence'

// Report Categories for sidebar
export const reportCategories: ReportCategory[] = [
  {
    name: 'Sales & Revenue',
    reports: [
      { id: 'sales-trends', name: 'Sales Trends', icon: 'TrendingUp' },
      { id: 'channel-mix', name: 'Channel Mix', icon: 'PieChart' },
      { id: 'check-analysis', name: 'Check Analysis', icon: 'Receipt' },
    ],
  },
  {
    name: 'Menu & Product',
    reports: [
      { id: 'menu-profitability', name: 'Menu Profitability', icon: 'DollarSign' },
      { id: 'menu-engineering', name: 'Menu Engineering', icon: 'BarChart3' },
      { id: 'category-trends', name: 'Category Trends', icon: 'Layers' },
    ],
  },
  {
    name: 'Labor & Operations',
    reports: [
      { id: 'labor-optimization', name: 'Labor Optimization', icon: 'Users' },
      { id: 'staffing-recs', name: 'Staffing Recommendations', icon: 'Calendar' },
      { id: 'cost-control', name: 'Cost Control', icon: 'Wallet' },
    ],
  },
  {
    name: 'Marketing & Growth',
    reports: [
      { id: 'seo-opportunities', name: 'SEO Opportunities', icon: 'Search' },
      { id: 'content-strategy', name: 'Content Strategy', icon: 'FileText' },
      { id: 'guest-retention', name: 'Guest Retention', icon: 'Heart' },
      { id: 'marketing-roi', name: 'Marketing ROI', icon: 'Target' },
    ],
  },
]

// Recommended reports (alert-triggered)
export const mockRecommendedReports: RecommendedReport[] = [
  {
    id: 'rec-1',
    type: 'SALES_DECLINE_ANALYSIS',
    title: 'Sales Decline Analysis',
    subtitle: 'Sales down 12% vs last month',
    severity: 'high',
    icon: 'TrendingDown',
    triggeredAt: '2025-01-24T14:30:00Z',
  },
  {
    id: 'rec-2',
    type: 'REVIEW_RESPONSE_STRATEGY',
    title: 'Review Response Strategy',
    subtitle: '3 negative reviews pending reply',
    severity: 'medium',
    icon: 'MessageSquare',
    triggeredAt: '2025-01-23T09:15:00Z',
  },
]

// Report definitions
export const mockReportDefinitions: Record<string, ReportDefinition> = {
  'sales-decline': {
    id: 'sales-decline',
    type: 'SALES_DECLINE_ANALYSIS',
    title: 'Sales Decline Analysis',
    description:
      'Analyze the root causes of your sales decline and get specific, actionable recommendations to recover lost revenue.',
    dataSources: [
      'Daily sales (90 days)',
      'Daypart breakdown',
      'Customer counts',
      'Menu mix changes',
      'Recent reviews (30 days)',
      'Labor metrics',
      'Weather data',
      'Local events',
    ],
    whatYouGet: [
      'Root causes ranked by confidence (High/Medium/Low)',
      'Specific action items with estimated revenue impact',
      'Timeline for implementation (immediate, short-term, long-term)',
      'Projected recovery if actions are taken',
    ],
    estimatedTokens: 12000,
    processingTime: '15-30 seconds',
    creditCost: 1,
  },
  'labor-optimization': {
    id: 'labor-optimization',
    type: 'LABOR_OPTIMIZATION',
    title: 'Labor Optimization',
    description:
      'Identify overstaffed shifts and position-level inefficiencies to reduce labor costs without impacting service.',
    dataSources: [
      'Labor hours by position (90 days)',
      'Sales by daypart (90 days)',
      'Overtime records',
      'Guest counts by daypart',
      'Industry benchmarks',
      'Your labor % targets',
    ],
    whatYouGet: [
      'Identification of overstaffed/understaffed shifts',
      'Position-by-position efficiency analysis',
      'Specific scheduling recommendations',
      'Estimated monthly savings',
      'Comparison to industry benchmarks',
    ],
    estimatedTokens: 14000,
    processingTime: '15-30 seconds',
    creditCost: 1,
  },
  'sales-trends': {
    id: 'sales-trends',
    type: 'SALES_TRENDS',
    title: 'Sales Trends',
    description:
      'Understand your sales patterns, identify growth opportunities, and spot potential issues before they impact revenue.',
    dataSources: [
      'Daily sales (12 months)',
      'Daypart breakdown',
      'Day of week analysis',
      'Seasonal patterns',
      'Year-over-year comparison',
    ],
    whatYouGet: [
      'Sales trend analysis with key insights',
      'Seasonal patterns and predictions',
      'Growth opportunities by daypart',
      'Comparison to prior year performance',
    ],
    estimatedTokens: 10000,
    processingTime: '10-20 seconds',
    creditCost: 1,
  },
  'channel-mix': {
    id: 'channel-mix',
    type: 'CHANNEL_MIX',
    title: 'Channel Mix Analysis',
    description:
      'Analyze your revenue mix across dine-in, takeout, delivery, and catering to optimize channel strategy.',
    dataSources: [
      'Sales by channel (90 days)',
      'Profitability by channel',
      'Guest frequency by channel',
      'Delivery platform fees',
    ],
    whatYouGet: [
      'Channel profitability comparison',
      'Recommendations for channel optimization',
      'Delivery platform fee analysis',
      'Growth opportunities by channel',
    ],
    estimatedTokens: 8000,
    processingTime: '10-20 seconds',
    creditCost: 1,
  },
  'check-analysis': {
    id: 'check-analysis',
    type: 'CHECK_ANALYSIS',
    title: 'Check Analysis',
    description:
      'Deep dive into check averages, item attach rates, and upselling opportunities to increase revenue per guest.',
    dataSources: [
      'Check averages by daypart',
      'Item attach rates',
      'Server performance',
      'Menu item frequency',
      'Add-on sales data',
    ],
    whatYouGet: [
      'Check average trends and benchmarks',
      'Upselling opportunity identification',
      'Server performance comparison',
      'Specific recommendations to boost check average',
    ],
    estimatedTokens: 9000,
    processingTime: '10-20 seconds',
    creditCost: 1,
  },
  'menu-profitability': {
    id: 'menu-profitability',
    type: 'MENU_PROFITABILITY',
    title: 'Menu Profitability',
    description:
      'Identify your most and least profitable menu items and get pricing and positioning recommendations.',
    dataSources: [
      'Item sales mix',
      'Food cost by item',
      'Contribution margin',
      'Popularity rankings',
      'Price history',
    ],
    whatYouGet: [
      'Profitability ranking of all items',
      'Pricing recommendations',
      'Items to promote vs remove',
      'Menu layout optimization tips',
    ],
    estimatedTokens: 11000,
    processingTime: '15-25 seconds',
    creditCost: 1,
  },
  'menu-engineering': {
    id: 'menu-engineering',
    type: 'MENU_ENGINEERING',
    title: 'Menu Engineering',
    description:
      'Classic menu engineering analysis - categorize items into Stars, Plowhorses, Puzzles, and Dogs.',
    dataSources: [
      'Item sales volume',
      'Item contribution margin',
      'Category averages',
      'Menu position data',
    ],
    whatYouGet: [
      'Menu engineering matrix',
      'Item categorization (Stars, Plowhorses, Puzzles, Dogs)',
      'Specific action for each item',
      'Menu redesign recommendations',
    ],
    estimatedTokens: 10000,
    processingTime: '15-25 seconds',
    creditCost: 1,
  },
  'review-response': {
    id: 'review-response',
    type: 'REVIEW_RESPONSE_STRATEGY',
    title: 'Review Response Strategy',
    description:
      'Get personalized response templates for your pending reviews and identify recurring themes to address.',
    dataSources: [
      'Recent reviews (all platforms)',
      'Review sentiment analysis',
      'Response history',
      'Competitor review comparison',
    ],
    whatYouGet: [
      'Personalized response templates',
      'Theme analysis across reviews',
      'Priority ranking for responses',
      'Operational improvement suggestions',
    ],
    estimatedTokens: 8000,
    processingTime: '10-20 seconds',
    creditCost: 1,
  },
  'seo-opportunities': {
    id: 'seo-opportunities',
    type: 'SEO_OPPORTUNITIES',
    title: 'SEO Opportunities',
    description:
      'Identify keyword opportunities, local SEO improvements, and content gaps to increase organic visibility.',
    dataSources: [
      'Current keyword rankings',
      'Search volume data',
      'Competitor rankings',
      'Google Business Profile data',
      'Website content analysis',
    ],
    whatYouGet: [
      'Keyword opportunities with search volume',
      'Content recommendations',
      'Local SEO checklist',
      'Competitor gap analysis',
    ],
    estimatedTokens: 12000,
    processingTime: '15-30 seconds',
    creditCost: 1,
  },
  'guest-retention': {
    id: 'guest-retention',
    type: 'GUEST_RETENTION',
    title: 'Guest Retention Analysis',
    description:
      'Understand your guest retention rates, identify at-risk customers, and get strategies to improve loyalty.',
    dataSources: [
      'Guest visit frequency',
      'Lapsed customer data',
      'Loyalty program data',
      'Review history by guest',
      'Check average trends',
    ],
    whatYouGet: [
      'Retention rate analysis',
      'At-risk customer identification',
      'Win-back campaign recommendations',
      'Loyalty program optimization',
    ],
    estimatedTokens: 10000,
    processingTime: '15-25 seconds',
    creditCost: 1,
  },
}

// Usage stats
export const mockUsage: UsageStats = {
  used: 5,
  limit: 10,
  resetDate: '2025-02-01',
  plan: 'Pro',
}

// Recent reports
export const mockRecentReports: IntelligenceReportSummary[] = [
  {
    id: 'rpt-1',
    type: 'LABOR_OPTIMIZATION',
    title: 'Labor Optimization',
    createdAt: '2025-01-20T14:30:00Z',
    summary: 'Reduce Sunday AM shift by 2 staff, saving $840/mo',
    userRating: 4,
    actionsCompleted: 2,
    actionsTotal: 4,
    projectedImpact: 840,
  },
  {
    id: 'rpt-2',
    type: 'REVIEW_RESPONSE_STRATEGY',
    title: 'Review Response Strategy',
    createdAt: '2025-01-15T10:15:00Z',
    summary: 'Service speed mentioned in 8 negative reviews - training script provided',
    userRating: 5,
    actionsCompleted: 3,
    actionsTotal: 3,
    projectedImpact: null,
  },
  {
    id: 'rpt-3',
    type: 'SALES_DECLINE_ANALYSIS',
    title: 'Sales Decline Analysis',
    createdAt: '2025-01-08T16:45:00Z',
    summary: 'Weekend brunch traffic down 23%, 3 reviews cite wait times',
    userRating: 3,
    actionsCompleted: 1,
    actionsTotal: 5,
    projectedImpact: 5600,
  },
]

// Full mock report result for demo
export const mockSalesDeclineReport: IntelligenceReport = {
  id: 'rpt-demo',
  locationId: 'loc-1',
  reportType: 'SALES_DECLINE_ANALYSIS',
  title: 'Sales Decline Analysis',
  requestedAt: '2025-01-25T14:34:00Z',

  summary: {
    headline:
      'Sales declined 12% ($18,400) driven by weekend brunch traffic and lower check averages',
    totalDecline: 18400,
    percentDecline: 12,
    primaryFactor: 'Weekend brunch traffic',
    recoveryEstimate: 5600,
  },

  rootCauses: [
    {
      id: 'rc-1',
      title: 'Weekend Brunch Traffic Down 23%',
      confidence: 'HIGH',
      description:
        'Saturday/Sunday 10am-2pm guest counts dropped from avg 145 to 112. This is the largest contributor to your overall decline.',
      supportingData: [
        { metric: 'Weekend brunch covers', value: '112 avg (was 145)' },
        { metric: 'Brunch revenue impact', value: '-$8,200/month' },
        { metric: 'Check average', value: '$42 (stable)' },
      ],
      relatedReviews: [
        '"Waited 45 minutes for a table on Saturday. Used to be our favorite brunch spot."',
        '"The wait was ridiculous. We left and went somewhere else."',
        '"Love the food but the wait times have gotten out of control."',
      ],
      externalFactors: ['New competitor (The Breakfast Club) opened 0.5 mi away on Jan 5'],
    },
    {
      id: 'rc-2',
      title: 'Average Check Down $8.40 (13.5%)',
      confidence: 'HIGH',
      description:
        'Dinner check average dropped from $62 to $53.60. Wine and appetizer sales are the primary drivers.',
      supportingData: [
        { metric: 'Dinner check avg', value: '$53.60 (was $62)' },
        { metric: 'Wine sales', value: '-34% ($4,200 less)' },
        { metric: 'Appetizer attach rate', value: '31% (was 45%)' },
        { metric: 'Dessert attach rate', value: '18% (stable)' },
      ],
      relatedReviews: [],
      externalFactors: [],
    },
    {
      id: 'rc-3',
      title: 'Weather Impact',
      confidence: 'LOW',
      description: 'Minor factor: 2 severe weather days this month vs 0 last month.',
      supportingData: [
        { metric: 'Severe weather days', value: '2 (vs 0 prior month)' },
        { metric: 'Estimated impact', value: '-$1,200' },
      ],
      relatedReviews: [],
      externalFactors: [],
    },
  ],

  actionPlan: {
    immediate: [
      {
        id: 'act-1',
        title: 'Address brunch wait times',
        description: 'The wait time issue is directly causing guest loss and negative reviews.',
        subTasks: [
          'Add 1 host during 10am-12pm Saturday/Sunday',
          'Implement waitlist texting (saves 15 min perceived wait)',
          'Consider reservations for brunch (currently walk-in only)',
        ],
        estimatedImpact: '$2,400/mo',
        difficulty: 'EASY',
        completed: false,
      },
      {
        id: 'act-2',
        title: 'Respond to negative brunch reviews',
        description:
          'The 3 recent negative reviews about wait times need responses acknowledging the issue and outlining improvements.',
        subTasks: [],
        estimatedImpact: 'Reputation',
        difficulty: 'EASY',
        completed: false,
        resources: [
          {
            type: 'template',
            title: 'View suggested responses',
            content: `Review 1 Response:
"Thank you for your feedback. We hear you about the wait times and are taking immediate action. Starting this weekend, we're adding an additional host during peak hours and implementing a text notification system so you can wait comfortably. We hope you'll give us another chance to show you the experience you deserve."

Review 2 Response:
"We're sorry your experience didn't meet expectations. Weekend brunch has become more popular than we anticipated, and we're making changes to ensure shorter wait times. We'd love to welcome you back - please reach out directly and we'll ensure you're seated promptly."`,
          },
        ],
      },
    ],
    shortTerm: [
      {
        id: 'act-3',
        title: 'Boost wine & appetizer sales',
        description:
          'Server behavior has shifted - appetizer and wine suggestions have decreased.',
        subTasks: [
          'Train servers on wine pairing suggestions',
          'Add "Start with..." appetizer prompt to server greeting',
          'Consider wine flight special ($18, high margin)',
        ],
        estimatedImpact: '$3,200/mo',
        difficulty: 'MEDIUM',
        completed: false,
        resources: [
          {
            type: 'script',
            title: 'Download wine training script',
            content: `Wine Pairing Quick Reference:

STEAK & RED MEAT
- Ribeye → Cabernet Sauvignon or Malbec
- Filet → Pinot Noir or lighter Cab
- Lamb → Syrah or Cabernet

SEAFOOD
- Salmon → Pinot Noir or Chardonnay
- Scallops → Chardonnay or Viognier
- Oysters → Champagne or Muscadet

SUGGESTED LANGUAGE
"For the ribeye, I'd recommend our house Cabernet - it's got great tannins that really complement the richness of the meat. Would you like a glass or should I bring the bottle for the table?"`,
          },
        ],
      },
      {
        id: 'act-4',
        title: 'Monitor new competitor',
        description:
          'The Breakfast Club opened nearby and may be capturing your brunch traffic.',
        subTasks: [
          'Visit competitor to assess offering',
          'Monitor their Google rating (currently 4.2, yours is 4.5)',
          'Consider "locals" loyalty promo to reinforce retention',
        ],
        estimatedImpact: 'Strategic',
        difficulty: 'EASY',
        completed: false,
      },
    ],
    longTerm: [
      {
        id: 'act-5',
        title: 'Evaluate brunch capacity expansion',
        description:
          'If wait times persist after immediate fixes, consider expanding brunch capacity.',
        subTasks: [
          'Analyze patio seating for brunch service',
          'Consider earlier opening (9am vs 10am)',
          'Evaluate second seating model',
        ],
        estimatedImpact: '$4,000/mo potential',
        difficulty: 'HARD',
        completed: false,
      },
    ],
  },

  projectedImpact: {
    currentMonthlySales: 135000,
    projectedRecovery: 5600,
    projectedMonthlySales: 140600,
    timelineWeeks: 6,
    confidence: 'MEDIUM',
  },

  isRead: false,
  userRating: null,
  actionsCompleted: 0,
  actionsTotal: 5,
}

// Running state steps
export const mockRunningSteps = [
  { name: 'Gathering sales data', status: 'complete' as const },
  { name: 'Analyzing trends', status: 'complete' as const },
  { name: 'Cross-referencing reviews', status: 'current' as const },
  { name: 'Identifying root causes', status: 'pending' as const },
  { name: 'Generating recommendations', status: 'pending' as const },
]
