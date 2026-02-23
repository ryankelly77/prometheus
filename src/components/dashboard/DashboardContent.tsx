'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  mockHealthScore,
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
import { Skeleton } from '@/components/ui/skeleton'

interface MetricsData {
  location: {
    id: string
    name: string
    city: string | null
    state: string | null
    conceptType: string | null
    groupName: string
  }
  current: {
    totalSales: number
    foodSales: number
    beverageSales: number
    totalCovers: number
    ppa: number | null
    laborPercent: number | null
    foodPercent: number | null
    primeCost: number | null
    salesTrend: number | null
  } | null
  monthly: Array<{
    month: string
    totalSales: number
    foodSales: number
    beverageSales: number
    totalCovers: number
    ppa: number | null
    laborCost: number | null
    laborPercent: number | null
    foodCost: number | null
    foodPercent: number | null
    primeCost: number | null
    revPash: number | null
  }>
}

interface HealthScoreData {
  locationId: string
  overallScore: number | null
  status: 'excellent' | 'good' | 'warning' | 'danger' | 'unknown'
  trend: Array<{ month: string; score: number; status: string }>
  breakdown: Array<{
    metric: string
    score: number
    weight: number
    weightedScore: number
  }>
  config: {
    weights: Record<string, number>
    targets: Record<string, number>
    thresholds: Record<string, number>
  } | null
}

interface DashboardContentProps {
  locationId: string
}

export function DashboardContent({ locationId }: DashboardContentProps) {
  const [healthScorePanelOpen, setHealthScorePanelOpen] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')

  // API data state
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null)
  const [healthScoreData, setHealthScoreData] = useState<HealthScoreData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data when location changes
  const fetchData = useCallback(async () => {
    if (!locationId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [metricsRes, healthRes] = await Promise.all([
        fetch(`/api/locations/${locationId}/metrics`),
        fetch(`/api/locations/${locationId}/health-score`),
      ])

      if (!metricsRes.ok || !healthRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [metrics, health] = await Promise.all([
        metricsRes.json(),
        healthRes.json(),
      ])

      setMetricsData(metrics)
      setHealthScoreData(health)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Find health score breakdown items for individual metrics
  const getMetricScore = (metricName: string) => {
    const mockItem = mockHealthScore.breakdown.find((b) => b.metric === metricName)
    if (!mockItem) return undefined

    const realItem = healthScoreData?.breakdown?.find((b) => b.metric === metricName)

    return {
      percentage: realItem?.score ?? mockItem.score,
      score: realItem?.weightedScore ?? mockItem.weightedScore,
      maxScore: realItem?.weight ?? mockItem.weight,
      trendData: mockItem.trend,
    }
  }

  // Get sparkline data from monthly metrics
  const monthlyData = metricsData?.monthly || []
  const totalSalesSparkline = monthlyData.length > 0
    ? monthlyData.map((m) => m.totalSales).reverse()
    : []
  const foodSalesSparkline = monthlyData.length > 0
    ? monthlyData.map((m) => m.foodSales).reverse()
    : []
  const customerSparkline = monthlyData.length > 0
    ? monthlyData.map((m) => m.totalCovers).reverse()
    : []
  const ppaSparkline = monthlyData.length > 0
    ? monthlyData.map((m) => m.ppa ?? 0).reverse()
    : []

  // Current metrics - use real data
  const currentMetrics = metricsData?.current || null

  // Health score - use real data
  const healthScore = healthScoreData?.overallScore ?? mockHealthScore.overallScore
  const healthTrend = healthScoreData?.trend?.map(t => t.score) ?? mockHealthScore.trend

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  // Format sales trend as change
  const formatSalesTrend = () => {
    if (!currentMetrics?.salesTrend) return { value: '—', type: 'neutral' as const }
    const trend = currentMetrics.salesTrend
    return {
      value: `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`,
      type: trend > 0 ? 'positive' as const : trend < 0 ? 'negative' as const : 'neutral' as const,
    }
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
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
          score={healthScore}
          trend={healthTrend}
          onClick={() => setHealthScorePanelOpen(true)}
          className="lg:col-span-1"
        />

        {/* Total Sales + Total Customers stacked */}
        <div className="flex flex-col gap-4">
          <MetricCard
            title="Total Sales"
            value={currentMetrics ? formatCurrency(currentMetrics.totalSales) : '—'}
            change={formatSalesTrend()}
            icon="DollarSign"
            sparklineData={totalSalesSparkline}
          />
          <MetricCard
            title="Total Customers"
            value={currentMetrics?.totalCovers?.toLocaleString() ?? '—'}
            change={{ value: '—', type: 'neutral' }}
            icon="Users"
            sparklineData={customerSparkline}
          />
        </div>

        {/* Food Sales + PPA stacked */}
        <div className="flex flex-col gap-4">
          <MetricCard
            title="Food Sales"
            value={currentMetrics ? formatCurrency(currentMetrics.foodSales) : '—'}
            change={{ value: '—', type: 'neutral' }}
            icon="DollarSign"
            sparklineData={foodSalesSparkline}
          />
          <MetricCard
            title="Per Person Average"
            value={currentMetrics?.ppa ? `$${currentMetrics.ppa.toFixed(2)}` : '—'}
            change={{ value: '—', type: 'neutral' }}
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
          value={currentMetrics?.laborPercent ? formatPercent(currentMetrics.laborPercent) : '—'}
          change={{ value: '—', type: 'neutral' }}
          icon="Percent"
          healthScore={getMetricScore('Labor Costs')}
        />
        <MetricCard
          title="Food Costs"
          value={currentMetrics?.foodPercent ? formatPercent(currentMetrics.foodPercent) : '—'}
          change={{ value: '—', type: 'neutral' }}
          icon="Percent"
          healthScore={getMetricScore('Food Costs')}
        />
        <MetricCard
          title="Prime Cost"
          value={currentMetrics?.primeCost ? formatPercent(currentMetrics.primeCost) : '—'}
          change={{ value: '—', type: 'neutral' }}
          icon="Percent"
          healthScore={getMetricScore('Prime Cost')}
        />
        <MetricCard
          title="Beverage Costs"
          value="—"
          change={{ value: '—', type: 'neutral' }}
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
        healthScore={{
          overallScore: healthScore,
          trend: healthTrend,
          ebitdaAdjustment: 0,
          breakdown: healthScoreData?.breakdown?.map(b => ({
            metric: b.metric,
            weight: b.weight,
            actual: 0,
            target: 0,
            score: b.score,
            weightedScore: b.weightedScore,
            trend: [],
          })) || mockHealthScore.breakdown,
        }}
        open={healthScorePanelOpen}
        onOpenChange={setHealthScorePanelOpen}
      />
    </div>
  )
}
