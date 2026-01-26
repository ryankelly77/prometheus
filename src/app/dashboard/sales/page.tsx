'use client'

import { useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import {
  mockHealthScore,
  mockCurrentMetrics,
  mockMonthlyMetrics,
  mockTotalSalesChart,
  mockFoodSalesChart,
  mockBeverageSalesChart,
  mockBeverageSegments,
  mockTargets,
  mockPriorYearMetrics,
  formatCurrency,
} from '@/lib/mock-data'
import { ComparativeBar, StackedBar, TimeSeriesLine } from '@/components/charts'
import { MetricCard, PeriodSelector, SectionHeader } from '@/components/dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// PPA Chart Data
const mockPPAChart = [
  { label: '2025 Actual', value: 58.23, isTarget: false, year: 2025 },
  { label: '2025 Target', value: 57, isTarget: true },
  { label: '2024 Actual', value: 58.16, isTarget: false, year: 2024 },
  { label: '2023 Actual', value: 58.14, isTarget: false, year: 2023 },
]

// 12-month PPA Trend
const mockPPATrend = mockMonthlyMetrics.map(m => ({
  date: m.month,
  value: m.ppa,
})).reverse()

export default function SalesPage() {
  const { currentLocation, isAllLocations } = useLocation()
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

  // Calculate beverage total
  const beverageTotal = mockCurrentMetrics.alcoholSales + mockCurrentMetrics.beerSales + mockCurrentMetrics.wineSales
  const beverageTarget = mockTargets.alcoholSales + mockTargets.beerSales + mockTargets.wineSales
  const priorBeverageTotal = mockPriorYearMetrics.alcoholSales + mockPriorYearMetrics.beerSales + mockPriorYearMetrics.wineSales

  // Calculate changes
  const totalSalesChange = ((mockCurrentMetrics.totalSales - mockPriorYearMetrics.totalSales) / mockPriorYearMetrics.totalSales * 100).toFixed(1)
  const foodSalesChange = ((mockCurrentMetrics.foodSales - mockPriorYearMetrics.foodSales) / mockPriorYearMetrics.foodSales * 100).toFixed(1)
  const beverageChange = ((beverageTotal - priorBeverageTotal) / priorBeverageTotal * 100).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Page Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Sales performance across all locations'
              : `Sales performance for ${currentLocation?.name}`}
          </p>
        </div>
        <PeriodSelector
          currentPeriod={currentPeriod}
          periodType={periodType}
          onPeriodChange={setCurrentPeriod}
          onPeriodTypeChange={setPeriodType}
        />
      </div>

      {/* View Tabs */}
      <Tabs defaultValue="charts">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6 mt-6">
          {/* Summary Cards + Insights Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Sales"
          value={formatCurrency(mockCurrentMetrics.totalSales)}
          change={{
            value: `${Number(totalSalesChange) >= 0 ? '+' : ''}${totalSalesChange}%`,
            type: Number(totalSalesChange) >= 0 ? 'positive' : 'negative',
          }}
          icon="DollarSign"
          healthScore={getMetricScore('Total Sales')}
        />
        <MetricCard
          title="Food Sales"
          value={formatCurrency(mockCurrentMetrics.foodSales)}
          change={{
            value: `${Number(foodSalesChange) >= 0 ? '+' : ''}${foodSalesChange}%`,
            type: Number(foodSalesChange) >= 0 ? 'positive' : 'negative',
          }}
          icon="DollarSign"
          healthScore={getMetricScore('Food Sales')}
        />
        <MetricCard
          title="Beverage Sales"
          value={formatCurrency(beverageTotal)}
          change={{
            value: `${Number(beverageChange) >= 0 ? '+' : ''}${beverageChange}%`,
            type: Number(beverageChange) >= 0 ? 'positive' : 'negative',
          }}
          icon="DollarSign"
          healthScore={{
            percentage: 92.15,
            score: 3.32,
            maxScore: 3.6,
            trendData: mockHealthScore.trend,
          }}
        />

        {/* Prometheus Insights */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 md:col-span-2 lg:col-span-2">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative h-full">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <h3 className="text-sm font-semibold">Prometheus Sales Insights</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md bg-health-danger/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-danger">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/></svg>
                </div>
                <p className="text-xs"><strong>{formatCurrency(mockTargets.totalSales - mockCurrentMetrics.totalSales)} below target</strong> — weekday dinners underperforming</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>Weekend sales up 12%</strong> vs last year</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-warning/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/></svg>
                </div>
                <p className="text-xs"><strong>Beer sales lagging</strong> — 17% below target</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>PPA exceeds target</strong> at $58.23</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Charts Section */}
      <SectionHeader
        title="Sales Breakdown"
        description="Detailed comparison vs targets and prior years"
      />

      {/* Row 1: Total Sales, Food Sales */}
      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>

      {/* Row 2: Beverage Sales, PPA */}
      <div className="grid gap-6 lg:grid-cols-2">
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

        <ComparativeBar
          title="PPA (Per Person Average)"
          description="Average spend per customer"
          data={mockPPAChart}
          format="currency"
          targetValue={mockTargets.ppa}
          healthScore={getMetricScore('PPA')}
          healthScorePosition="header"
        />
      </div>

      {/* PPA Trend Section */}
      <SectionHeader
        title="PPA Trend"
        description="12-month per person average performance"
      />

      <div className="grid gap-6">
        <TimeSeriesLine
          title="Per Person Average - 12 Month Trend"
          description="Monthly PPA over the past year"
          data={mockPPATrend}
          format="currency"
          goalLine={{
            value: mockTargets.ppa,
            label: `Target: $${mockTargets.ppa}`,
            type: 'max',
          }}
          healthScore={getMetricScore('PPA')}
          healthScorePosition="header"
          explanation="Average spend per customer. Target is $57 or higher."
        />
      </div>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Table2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sales Data Table</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                View daily sales data with breakdowns, sync status, and export capabilities.
              </p>
              <a
                href="/dashboard/sales/data"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                View Data Table
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
