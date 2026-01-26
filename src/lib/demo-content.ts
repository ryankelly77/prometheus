export interface PageContext {
  title: string
  description: string
  dataSources: Array<{
    name: string
    source: string
  }>
  demoNote: string
  comingSoon: string[]
}

export const pageContexts: Record<string, PageContext> = {
  '/dashboard': {
    title: 'Dashboard',
    description:
      'The main KPI dashboard showing health scores, sales trends, and key metrics at a glance. The health score is calculated from weighted metrics you configure.',
    dataSources: [
      { name: 'Sales & Labor', source: 'Toast POS' },
      { name: 'Food Cost', source: 'Restaurant365' },
      { name: 'Reviews', source: 'BrightLocal' },
      { name: 'Reservations', source: 'OpenTable' },
    ],
    demoNote:
      'All data shown is sample data. In production, this syncs nightly from your connected integrations.',
    comingSoon: [
      'Multi-location switcher',
      'Custom date range picker',
      'Export dashboard to PDF',
    ],
  },
  '/dashboard/health-score': {
    title: 'Health Score Configuration',
    description:
      'Configure how your restaurant health score is calculated. Assign weights to different metrics based on what matters most to your operation.',
    dataSources: [{ name: 'All Metrics', source: 'Calculated from connected sources' }],
    demoNote:
      'Changes here affect the health score shown on the dashboard. Weights must total 100%.',
    comingSoon: [
      'Health score alerts',
      'Historical health score trends',
      'Benchmark vs similar restaurants',
    ],
  },
  '/dashboard/sales': {
    title: 'Sales & Revenue',
    description:
      'Deep dive into your sales performance by day, week, and month. Track trends and compare to prior periods.',
    dataSources: [
      { name: 'Sales Data', source: 'Toast POS' },
      { name: 'Guest Counts', source: 'Toast POS' },
      { name: 'Check Averages', source: 'Calculated' },
    ],
    demoNote: 'In production, this data syncs every morning at 6 AM for the prior day.',
    comingSoon: [
      'Sales by daypart (breakfast/lunch/dinner)',
      'Sales by revenue center',
      'Hourly sales breakdown',
      'Server performance',
    ],
  },
  '/dashboard/sales/data': {
    title: 'Sales Data',
    description:
      'Daily sales breakdown with sync status. Select rows to re-sync data from Toast or manually edit values.',
    dataSources: [
      { name: 'Daily Sales', source: 'Toast POS' },
      { name: 'Category Breakdown', source: 'Toast POS' },
    ],
    demoNote: 'Data syncs automatically each morning. Manual edits are tracked with an asterisk (*) and reason.',
    comingSoon: [
      'Bulk data import',
      'Export to CSV/Excel',
      'Sync history log',
      'Data validation alerts',
    ],
  },
  '/dashboard/costs': {
    title: 'Cost Management',
    description:
      'Monitor your prime costs — food, beverage, and labor. The #1 controllable expense in restaurants.',
    dataSources: [
      { name: 'Food Cost', source: 'Restaurant365' },
      { name: 'Beverage Cost', source: 'Restaurant365' },
      { name: 'Labor Cost', source: 'Toast POS' },
    ],
    demoNote:
      'Food cost percentage is calculated as (Food Cost / Food Sales). Industry target is typically 28-32%.',
    comingSoon: [
      'Theoretical vs actual food cost',
      'Waste tracking',
      'Vendor price alerts',
      'Labor scheduling optimization',
    ],
  },
  '/dashboard/costs/data': {
    title: 'Cost Data',
    description:
      'Daily cost breakdown including labor hours, food cost, and prime cost percentage. Track sync status and edit values.',
    dataSources: [
      { name: 'Labor Data', source: 'Toast POS' },
      { name: 'Food Cost', source: 'Restaurant365' },
    ],
    demoNote: 'Prime cost = Labor % + Food %. Industry benchmark is 60% or below.',
    comingSoon: [
      'Invoice upload',
      'Theoretical food cost comparison',
      'Labor scheduling integration',
      'Variance alerts',
    ],
  },
  '/dashboard/customers': {
    title: 'Guest Analytics',
    description:
      'Understand your guest base — new vs returning, visit frequency, and VIP identification.',
    dataSources: [
      { name: 'Reservations', source: 'OpenTable / Resy' },
      { name: 'Guest Profiles', source: 'OpenTable CRM' },
      { name: 'Visit History', source: 'OpenTable' },
    ],
    demoNote: 'Guest data is matched by email and phone across reservation platforms.',
    comingSoon: [
      'Guest segmentation',
      'Churn prediction',
      'VIP alerts for hosts',
      'Birthday/anniversary tracking',
    ],
  },
  '/dashboard/customers/data': {
    title: 'Guest Data',
    description:
      'Search and filter your guest database. View visit history, spending patterns, and guest tags.',
    dataSources: [
      { name: 'Guest Profiles', source: 'OpenTable / Resy' },
      { name: 'Visit History', source: 'Reservation platforms' },
    ],
    demoNote: 'Guests are matched across platforms by email and phone. VIP status is based on visit frequency.',
    comingSoon: [
      'Guest merge/dedup',
      'Custom tags',
      'Export guest list',
      'Email campaign integration',
    ],
  },
  '/dashboard/reviews': {
    title: 'Review Management',
    description:
      'Aggregate reviews from Google, Yelp, TripAdvisor, and more in one place. Track sentiment trends and response rates.',
    dataSources: [
      { name: 'Reviews', source: 'BrightLocal' },
      { name: 'Google Reviews', source: 'via BrightLocal' },
      { name: 'Yelp Reviews', source: 'via BrightLocal' },
      { name: 'TripAdvisor', source: 'via BrightLocal' },
    ],
    demoNote: 'BrightLocal aggregates reviews from 80+ sites. We pull new reviews daily.',
    comingSoon: [
      'AI-suggested responses',
      'Sentiment analysis',
      'Staff mention detection',
      'Review request automation',
    ],
  },
  '/dashboard/reviews/data': {
    title: 'Reviews Data',
    description:
      'Browse and filter all reviews from connected platforms. View full review text, ratings, and response status.',
    dataSources: [
      { name: 'All Reviews', source: 'BrightLocal' },
      { name: 'Response Status', source: 'Platform APIs' },
    ],
    demoNote: 'Reviews sync daily. Responding to reviews is done on the original platform.',
    comingSoon: [
      'Reply directly from dashboard',
      'Bulk export reviews',
      'Review tagging',
      'Sentiment filtering',
    ],
  },
  '/dashboard/visibility': {
    title: 'Online Visibility',
    description:
      'Track how visible your restaurant is in search results — both traditional SEO and Google Maps local search.',
    dataSources: [
      { name: 'Website Rankings', source: 'SEMrush' },
      { name: 'Local/Maps Rankings', source: 'BrightLocal' },
      { name: 'AI Visibility', source: 'SEMrush (Pro plan)' },
    ],
    demoNote:
      'Website visibility shows organic search rankings. Maps visibility shows your Google Business Profile performance in local pack results.',
    comingSoon: [
      'Competitor tracking',
      'Keyword recommendations',
      'Citation management',
      'GBP optimization tips',
    ],
  },
  '/dashboard/social': {
    title: 'Social Media',
    description:
      'Track performance across Instagram, Facebook, and TikTok. See what content resonates with your audience.',
    dataSources: [
      { name: 'Social Metrics', source: 'Sprout Social / Metricool / Hootsuite' },
    ],
    demoNote:
      'We integrate with your existing social media management tool rather than requiring a new one.',
    comingSoon: [
      'Content calendar',
      'Best time to post analysis',
      'Competitor social tracking',
      'AI content suggestions',
    ],
  },
  '/dashboard/pr': {
    title: 'PR & Marketing',
    description:
      "Track press coverage, media mentions, and awards. Document your restaurant's story.",
    dataSources: [
      { name: 'Media Mentions', source: 'Manual entry / CSV import' },
      { name: 'Future', source: 'Cision / Meltwater integration' },
    ],
    demoNote:
      'Currently supports manual entry and CSV import. Media monitoring integrations coming soon.',
    comingSoon: [
      'Automated media monitoring',
      'PR value calculation',
      'Press kit generator',
      'Award tracking reminders',
    ],
  },
  '/dashboard/intelligence': {
    title: 'Intelligence',
    description:
      "AI-powered analysis that tells you what's wrong and exactly how to fix it. This is where 30 years of restaurant expertise meets your data.",
    dataSources: [
      { name: 'All Connected Sources', source: 'Aggregated & analyzed' },
      { name: 'AI Analysis', source: 'Claude (Anthropic)' },
    ],
    demoNote:
      'Intelligence reports consume credits. The demo shows sample report output — in production, reports are generated fresh from your actual data.',
    comingSoon: ['Custom questions', 'Scheduled reports', 'Action tracking', 'Team sharing'],
  },
  '/dashboard/settings': {
    title: 'Settings',
    description:
      'Configure your account, integrations, team members, and billing.',
    dataSources: [],
    demoNote: 'Integration settings are where you connect your data sources.',
    comingSoon: [
      'SSO / SAML authentication',
      'API access for custom integrations',
      'Webhook notifications',
    ],
  },
}
