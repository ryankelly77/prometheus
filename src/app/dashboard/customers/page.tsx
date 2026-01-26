'use client'

import { useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import {
  mockHealthScore,
  mockCurrentMetrics,
  mockCustomerStats,
  mockCustomerLoyaltyChart,
  mockCustomerLoyaltySegments,
  mockPPAChart,
  mockRevPASHChart,
  mockLoyaltyTrend,
  mockTargets,
  formatCurrency,
  formatPercent,
} from '@/lib/mock-data'
import { ComparativeBar, StackedBar, TimeSeriesLine } from '@/components/charts'
import { MetricCard, PeriodSelector, SectionHeader } from '@/components/dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CustomersPage() {
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

  // Calculate changes
  const customersChange = ((mockCustomerStats.totalCustomers - mockCustomerStats.priorYearCustomers) / mockCustomerStats.priorYearCustomers * 100).toFixed(1)
  const ppaChange = ((mockCustomerStats.ppa - mockCustomerStats.priorYearPPA) / mockCustomerStats.priorYearPPA * 100).toFixed(1)
  const loyaltyChange = (mockCustomerStats.loyaltyPercent - mockCustomerStats.priorYearLoyalty).toFixed(1)
  const revPashChange = ((mockCustomerStats.revPash - mockCustomerStats.priorYearRevPash) / mockCustomerStats.priorYearRevPash * 100).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Page Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Customer insights across all locations'
              : `Customer insights for ${currentLocation?.name}`}
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
          title="Total Customers"
          value={mockCustomerStats.totalCustomers.toLocaleString()}
          change={{
            value: `${Number(customersChange) >= 0 ? '+' : ''}${customersChange}%`,
            type: Number(customersChange) >= 0 ? 'positive' : 'negative',
          }}
          icon="Users"
          healthScore={getMetricScore('Customer Loyalty')}
        />
        <MetricCard
          title="PPA"
          value={formatCurrency(mockCustomerStats.ppa)}
          change={{
            value: `${Number(ppaChange) >= 0 ? '+' : ''}${ppaChange}%`,
            type: Number(ppaChange) >= 0 ? 'positive' : 'negative',
          }}
          icon="DollarSign"
          healthScore={getMetricScore('PPA')}
        />
        <MetricCard
          title="Loyalty %"
          value={formatPercent(mockCustomerStats.loyaltyPercent, 1)}
          change={{
            value: `${Number(loyaltyChange) >= 0 ? '+' : ''}${loyaltyChange}%`,
            type: Number(loyaltyChange) >= 0 ? 'positive' : 'negative',
          }}
          icon="Target"
          healthScore={getMetricScore('Customer Loyalty')}
        />

        {/* Prometheus Insights */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 md:col-span-2 lg:col-span-2">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative h-full">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <h3 className="text-sm font-semibold">Prometheus Customer Insights</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>PPA above target</strong> at $58.23 — strong upselling</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-warning/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/></svg>
                </div>
                <p className="text-xs"><strong>Loyalty at 13.2%</strong> — below 15% target, focus on repeat visits</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>VIP segment growing</strong> — 611 guests with 10+ visits</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>Customer count up 3.7%</strong> vs last year</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Charts Section */}
      <SectionHeader
        title="Customer Breakdown"
        description="Visit frequency and spending patterns"
      />

      {/* Row 1: Loyalty Stacked Bar, PPA Comparative Bar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <StackedBar
          title="Customer Loyalty"
          description="Visit frequency distribution"
          data={mockCustomerLoyaltyChart}
          segments={mockCustomerLoyaltySegments}
          format="number"
          useYearColors
          hideLegend
          healthScore={getMetricScore('Customer Loyalty')}
          healthScorePosition="header"
          explanation="Loyalty % = Guests with 3+ visits / Total guests. Target is 15% or higher."
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

      {/* 12-Month Loyalty Trend Section */}
      <SectionHeader
        title="Loyalty Trend"
        description="12-month customer retention performance"
      />

      <div className="grid gap-6">
        <TimeSeriesLine
          title="Customer Loyalty % - 12 Month Trend"
          description="Monthly loyalty percentage (guests with 3+ visits)"
          data={mockLoyaltyTrend}
          format="percent"
          goalLine={{
            value: mockTargets.customerLoyalty,
            label: `Target: ${mockTargets.customerLoyalty}%`,
            type: 'max',
          }}
          healthScore={getMetricScore('Customer Loyalty')}
          healthScorePosition="header"
          explanation="Loyalty % = Percentage of guests who have visited 3 or more times. Target is 15% or higher."
        />
      </div>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Table2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Customer Data Table</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                View guest data with visit history, segmentation, and reservation details.
              </p>
              <a
                href="/dashboard/customers/data"
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
