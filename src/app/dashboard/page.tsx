'use client'

import { useState } from 'react'
import { useLocation } from '@/hooks/use-location'
import {
  mockHealthScore,
  mockCurrentMetrics,
  mockMonthlyMetrics,
  mockTotalSalesChart,
  mockFoodSalesChart,
  mockBeverageSalesChart,
  mockBeverageSegments,
  mockLoyaltyChart,
  mockLoyaltySegments,
  mockPrimeCostTrend,
  mockRevPashTrend,
  mockVisibilityTrend,
  mockAIVisibilityTrend,
  mockReviewBreakdownChart,
  mockReviewSegments,
  mockPRMentionsTrend,
  mockTargets,
  formatCurrency,
  formatPercent,
} from '@/lib/mock-data'
import { ComparativeBar, StackedBar, HorizontalStackedBar, TimeSeriesLine, SimpleAreaChart, SimpleBarChart, LockedChart } from '@/components/charts'
import {
  HealthScoreCard,
  HealthScorePanel,
  MetricCard,
  PeriodSelector,
  SectionHeader,
} from '@/components/dashboard'

export default function DashboardPage() {
  const { currentLocation, isAllLocations } = useLocation()
  const [healthScorePanelOpen, setHealthScorePanelOpen] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')

  // Find health score breakdown items for individual metrics
  const getMetricScore = (metricName: string) => {
    const item = mockHealthScore.breakdown.find((b) => b.metric === metricName)
    return item
      ? {
          percentage: item.score,
          score: item.weightedScore,
          maxScore: item.weight,
          trendData: item.trend,
        }
      : undefined
  }

  // Get sparkline data from monthly metrics
  const totalSalesSparkline = mockMonthlyMetrics.map((m) => m.totalSales).reverse()
  const foodSalesSparkline = mockMonthlyMetrics.map((m) => m.foodSales).reverse()
  const customerSparkline = mockMonthlyMetrics.map((m) => m.totalCustomers).reverse()
  const ppaSparkline = mockMonthlyMetrics.map((m) => m.ppa).reverse()

  return (
    <div className="space-y-6">
      {/* Page Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Performance overview across all locations'
              : `Performance for ${currentLocation?.name}`}
          </p>
        </div>
        <PeriodSelector
          currentPeriod={currentPeriod}
          periodType={periodType}
          onPeriodChange={setCurrentPeriod}
          onPeriodTypeChange={setPeriodType}
        />
      </div>

      {/* Health Score Card (Compact) + KPI Summary + Insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Health Score - Takes 1 column on lg */}
        <HealthScoreCard
          score={mockHealthScore.overallScore}
          trend={mockHealthScore.trend}
          onClick={() => setHealthScorePanelOpen(true)}
          className="lg:col-span-1"
        />

        {/* Total Sales + Total Customers stacked */}
        <div className="flex flex-col gap-4">
          <MetricCard
            title="Total Sales"
            value={formatCurrency(mockCurrentMetrics.totalSales)}
            change={{ value: '+3.8%', type: 'positive' }}
            icon="DollarSign"
            sparklineData={totalSalesSparkline}
          />
          <MetricCard
            title="Total Customers"
            value={mockCurrentMetrics.totalCustomers.toLocaleString()}
            change={{ value: '+2.1%', type: 'positive' }}
            icon="Users"
            sparklineData={customerSparkline}
          />
        </div>

        {/* Food Sales + PPA stacked */}
        <div className="flex flex-col gap-4">
          <MetricCard
            title="Food Sales"
            value={formatCurrency(mockCurrentMetrics.foodSales)}
            change={{ value: '+3.8%', type: 'positive' }}
            icon="DollarSign"
            sparklineData={foodSalesSparkline}
          />
          <MetricCard
            title="Per Person Average"
            value={`$${mockCurrentMetrics.ppa.toFixed(2)}`}
            change={{ value: '+0.5%', type: 'positive' }}
            icon="Target"
            sparklineData={ppaSparkline}
          />
        </div>

        {/* Prometheus Insights - Takes 2 columns */}
        <div className="md:col-span-2 lg:col-span-2">
          <div className="relative h-full overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                </div>
                <h3 className="text-lg font-semibold">Prometheus Insights</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg bg-health-danger/10 p-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-health-danger">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/></svg>
                  </div>
                  <p className="text-sm"><strong>Sales $59,839 below target</strong> — consider weekday dinner promotions to close the gap</p>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-health-warning/10 p-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-health-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/></svg>
                  </div>
                  <p className="text-sm"><strong>Customer loyalty at 13.2%</strong> — below 15% goal, launch a repeat visit incentive</p>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-health-excellent/10 p-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-sm"><strong>Prime cost on target</strong> at 59.98% — labor efficiency improved 0.5% vs last month</p>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-health-excellent/10 p-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-sm"><strong>Website visibility +54% YoY</strong> — SEO efforts paying off, maintain strategy</p>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
                    <span className="text-muted-foreground">Want AI-powered recommendations?</span>
                  </div>
                  <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Section */}
      <SectionHeader
        title="Sales Performance"
        description="Revenue metrics vs targets and prior years"
      />

      {/* Row 1: Total Sales, Food Sales, Beverage Sales */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ComparativeBar
          title="Total Sales"
          description="Current month vs target and prior years"
          data={mockTotalSalesChart}
          format="currency"
          targetValue={mockTargets.totalSales}
          healthScore={getMetricScore('Total Sales')}
          healthScorePosition="header"
        />

        <ComparativeBar
          title="Food Sales"
          description="Current month vs target and prior years"
          data={mockFoodSalesChart}
          format="currency"
          targetValue={mockTargets.foodSales}
          healthScore={getMetricScore('Food Sales')}
          healthScorePosition="header"
        />

        <StackedBar
          title="Beverage Sales"
          description="Breakdown by alcohol, beer, and wine"
          data={mockBeverageSalesChart}
          segments={mockBeverageSegments}
          format="currency"
          useYearColors
          hideLegend
          healthScore={{
            percentage: 92.15,
            score: 3.32,
            maxScore: 3.6,
            trendData: mockHealthScore.trend,
          }}
          healthScorePosition="header"
        />
      </div>

      {/* Row 2: Prime Cost, RevPASH */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TimeSeriesLine
          title="Prime Cost Trend"
          description="12-month trend (lower is better)"
          data={mockPrimeCostTrend}
          format="percent"
          goalLine={{
            value: mockTargets.primeCost,
            label: `Target: ${mockTargets.primeCost}%`,
            type: 'min',
          }}
          healthScore={getMetricScore('Prime Cost')}
          healthScorePosition="header"
          explanation="Prime cost = Food cost % + Labor cost %. Target is 60% or below."
        />

        <TimeSeriesLine
          title="RevPASH"
          description="12-month revenue per available seat hour"
          data={mockRevPashTrend}
          format="currency"
          color="hsl(var(--chart-4))"
          healthScore={getMetricScore('RevPASH')}
          healthScorePosition="header"
          explanation="Revenue per Available Seat Hour measures how efficiently seating capacity generates revenue."
        />
      </div>

      {/* Cost Management Section */}
      <SectionHeader
        title="Cost Management"
        description="Labor and food cost efficiency"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Labor Costs"
          value={formatPercent(28.01)}
          change={{ value: '-0.5%', type: 'positive' }}
          icon="Percent"
          healthScore={getMetricScore('Labor Costs')}
        />
        <MetricCard
          title="Food Costs"
          value={formatPercent(32.01)}
          change={{ value: '+0.2%', type: 'negative' }}
          icon="Percent"
          healthScore={getMetricScore('Food Costs')}
        />
        <MetricCard
          title="Prime Cost"
          value={formatPercent(mockCurrentMetrics.primeCost)}
          change={{ value: '-0.5%', type: 'positive' }}
          icon="Percent"
          healthScore={getMetricScore('Prime Cost')}
        />
        <MetricCard
          title="Beverage Costs"
          value={formatPercent(22.5)}
          change={{ value: '-1.2%', type: 'positive' }}
          icon="Percent"
          healthScore={getMetricScore('Beverage Costs')}
        />
      </div>

      {/* Customer Insights Section */}
      <SectionHeader
        title="Customer Insights"
        description="Loyalty and spending patterns"
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {/* Customer Loyalty - Horizontal Stacked Bar */}
        <HorizontalStackedBar
          title="Customer Loyalty"
          description="Visit frequency distribution (% of total customers)"
          data={mockLoyaltyChart}
          segments={mockLoyaltySegments}
          healthScore={getMetricScore('Customer Loyalty')}
          healthScorePosition="header"
          targetLine={{ value: 15, label: 'Target: 15% loyal (3+ visits)' }}
          explanation="Measures % of customers with 3+ visits per month. Target is 15% combined for 3-9 and 10+ visits."
        />

        {/* 1, 2, 3 Star Review Count - Stacked Bar */}
        <StackedBar
          title="1 Star, 2 Star, 3 Star Review Count"
          description="Monthly negative review breakdown"
          data={mockReviewBreakdownChart}
          segments={mockReviewSegments}
          format="number"
          xAxisKey="date"
          goalLine={{ value: 9, label: 'Target', type: 'max' }}
          healthScore={getMetricScore('Reviews')}
          healthScorePosition="header"
          explanation="Combined count of 1, 2, and 3 star reviews. Goal is to stay under 10 per month."
        />
      </div>

      {/* Marketing & Visibility Section */}
      <SectionHeader
        title="Marketing & Visibility"
        description="Online presence and reputation"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Website Visibility - Line Chart */}
        <TimeSeriesLine
          title="Website Visibility"
          description="12-month SEO visibility trend"
          data={mockVisibilityTrend}
          format="percent"
          goalLine={{
            value: mockTargets.websiteVisibility,
            label: `Target: ${mockTargets.websiteVisibility}%`,
            type: 'max',
          }}
          healthScore={getMetricScore('Website Visibility')}
          healthScorePosition="header"
          color="hsl(var(--chart-3))"
          explanation="Search visibility score from SEMRush/BrightLocal integration."
        />

        {/* AI Visibility - Locked Premium Feature */}
        <LockedChart
          title="AI Visibility"
          description="AI search presence across ChatGPT, Perplexity & more"
        >
          <SimpleAreaChart
            data={mockAIVisibilityTrend}
            format="percent"
            color="hsl(var(--chart-2))"
          />
        </LockedChart>

        {/* PR Mentions - Bar Chart */}
        <SimpleBarChart
          title="PR Mentions"
          description="Monthly press and media mentions"
          data={mockPRMentionsTrend}
          color="#D8B4FE"
          goalLine={{ value: 6 }}
          healthScore={getMetricScore('PR Mentions')}
          healthScorePosition="header"
          explanation="Goal is 6+ PR mentions per month from media coverage and press releases."
        />
      </div>

      {/* Health Score Slide-out Panel */}
      <HealthScorePanel
        healthScore={mockHealthScore}
        open={healthScorePanelOpen}
        onOpenChange={setHealthScorePanelOpen}
      />
    </div>
  )
}
