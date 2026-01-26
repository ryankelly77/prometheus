'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Table2 } from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import {
  mockHealthScore,
  mockCurrentMetrics,
  mockMonthlyMetrics,
  mockLaborCostsChart,
  mockFoodCostsChart,
  mockPrimeCostChart,
  mockPrimeCostTrend,
  mockTargets,
  mockPriorYearMetrics,
  formatPercent,
} from '@/lib/mock-data'
import { ComparativeBarCost, TimeSeriesLine } from '@/components/charts'
import { MetricCard, PeriodSelector, SectionHeader } from '@/components/dashboard'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CostsPage() {
  const router = useRouter()
  const { currentLocation, isAllLocations } = useLocation()
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')

  const handleTabChange = (value: string) => {
    if (value === 'data') {
      router.push('/dashboard/costs/data')
    }
  }

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

  // Calculate current percentages
  const laborPercent = (mockCurrentMetrics.laborCosts / mockCurrentMetrics.totalSales) * 100
  const foodPercent = (mockCurrentMetrics.foodCosts / mockCurrentMetrics.totalSales) * 100
  const primePercent = mockCurrentMetrics.primeCost

  // Calculate prior year percentages
  const priorLaborPercent = (mockPriorYearMetrics.laborCosts / mockPriorYearMetrics.totalSales) * 100
  const priorFoodPercent = (mockPriorYearMetrics.foodCosts / mockPriorYearMetrics.totalSales) * 100
  const priorPrimePercent = mockPriorYearMetrics.primeCost

  // Calculate changes (for costs, negative is good)
  const laborChange = (laborPercent - priorLaborPercent).toFixed(2)
  const foodChange = (foodPercent - priorFoodPercent).toFixed(2)
  const primeChange = (primePercent - priorPrimePercent).toFixed(2)

  return (
    <div className="space-y-6">
      {/* Page Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Costs</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Cost management across all locations'
              : `Cost management for ${currentLocation?.name}`}
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
      <Tabs value="charts" onValueChange={handleTabChange}>
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
      </Tabs>

      <div className="space-y-6 mt-6">
          {/* Summary Cards + Insights Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Labor Cost %"
          value={formatPercent(laborPercent)}
          change={{
            value: `${Number(laborChange) <= 0 ? '' : '+'}${laborChange}%`,
            type: Number(laborChange) <= 0 ? 'positive' : 'negative',
          }}
          icon="Percent"
          healthScore={getMetricScore('Labor Costs')}
        />
        <MetricCard
          title="Food Cost %"
          value={formatPercent(foodPercent)}
          change={{
            value: `${Number(foodChange) <= 0 ? '' : '+'}${foodChange}%`,
            type: Number(foodChange) <= 0 ? 'positive' : 'negative',
          }}
          icon="Percent"
          healthScore={getMetricScore('Food Costs')}
        />
        <MetricCard
          title="Prime Cost %"
          value={formatPercent(primePercent)}
          change={{
            value: `${Number(primeChange) <= 0 ? '' : '+'}${primeChange}%`,
            type: Number(primeChange) <= 0 ? 'positive' : 'negative',
          }}
          icon="Percent"
          healthScore={getMetricScore('Prime Cost')}
        />

        {/* Prometheus Insights */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 md:col-span-2 lg:col-span-2">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative h-full">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <h3 className="text-sm font-semibold">Prometheus Cost Insights</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>Prime cost on target</strong> at 59.98% — excellent control</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>Labor efficiency improved</strong> — down 1% YoY</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-warning/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/></svg>
                </div>
                <p className="text-xs"><strong>Food costs slightly up</strong> — review vendor pricing</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>Overtime down 15%</strong> vs last month</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Charts Section */}
      <SectionHeader
        title="Cost Breakdown"
        description="Detailed comparison vs targets and prior years (lower is better)"
      />

      {/* Row 1: Labor Costs, Food Costs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ComparativeBarCost
          title="Labor Costs"
          description="Current month vs target and prior years"
          data={mockLaborCostsChart}
          format="percent"
          targetValue={mockTargets.laborCosts}
          healthScore={getMetricScore('Labor Costs')}
          healthScorePosition="header"
        />

        <ComparativeBarCost
          title="Food Costs"
          description="Current month vs target and prior years"
          data={mockFoodCostsChart}
          format="percent"
          targetValue={mockTargets.foodCosts}
          healthScore={getMetricScore('Food Costs')}
          healthScorePosition="header"
        />
      </div>

      {/* Row 2: Prime Cost */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ComparativeBarCost
          title="Prime Cost"
          description="Labor + Food costs combined"
          data={mockPrimeCostChart}
          format="percent"
          targetValue={mockTargets.primeCost}
          healthScore={getMetricScore('Prime Cost')}
          healthScorePosition="header"
          explanation="Prime cost = Labor cost % + Food cost %. Target is 60% or below."
        />
      </div>

      {/* 12-Month Trend Section */}
      <SectionHeader
        title="Cost Trend"
        description="12-month historical performance"
      />

      <div className="grid gap-6">
        <TimeSeriesLine
          title="Prime Cost - 12 Month Trend"
          description="Monthly prime cost percentage over the past year (lower is better)"
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
      </div>
      </div>
    </div>
  )
}
