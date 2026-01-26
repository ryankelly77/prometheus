'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Table2, Star } from 'lucide-react'
import { useLocation } from '@/hooks/use-location'
import {
  mockHealthScore,
  mockReviewStats,
  mockCumulativeRatingChart,
  mockReviewsByRatingChart,
  mockRatingSegments,
  mockNegativeReviewsTrend,
  mockReviewsBySource,
} from '@/lib/mock-data'
import { StackedBar, TimeSeriesLine, DonutChart, CumulativeRatingChart } from '@/components/charts'
import { MetricCard, PeriodSelector, SectionHeader } from '@/components/dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Star rating display component
function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
          size={size}
        />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const router = useRouter()
  const { currentLocation, isAllLocations } = useLocation()
  const [currentPeriod, setCurrentPeriod] = useState('2025-01')
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month')

  const handleTabChange = (value: string) => {
    if (value === 'data') {
      router.push('/dashboard/reviews/data')
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

  // Calculate changes
  const ratingChange = (mockReviewStats.averageRating - mockReviewStats.priorYearAvgRating).toFixed(1)
  const newReviewsChange = ((mockReviewStats.newReviewsThisPeriod - mockReviewStats.priorYearNewReviews) / mockReviewStats.priorYearNewReviews * 100).toFixed(0)
  const negativeChange = mockReviewStats.negativeReviews - mockReviewStats.priorYearNegative

  return (
    <div className="space-y-6">
      {/* Page Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
          <p className="text-muted-foreground">
            {isAllLocations
              ? 'Review performance across all locations'
              : `Review performance for ${currentLocation?.name}`}
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
          title="Total Reviews"
          value={mockReviewStats.totalReviews.toLocaleString()}
          change={{
            value: `+${mockReviewStats.newReviewsThisPeriod} this month`,
            type: 'positive',
          }}
          icon="Target"
        />

        {/* Average Rating Card with Stars */}
        <Card className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Star className="h-5 w-5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{mockReviewStats.averageRating}</span>
                  <StarRating rating={Math.round(mockReviewStats.averageRating)} size={14} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-sm font-medium ${Number(ratingChange) >= 0 ? 'text-health-excellent' : 'text-health-danger'}`}>
                {Number(ratingChange) >= 0 ? '+' : ''}{ratingChange}
              </span>
              <span className="text-sm text-muted-foreground">vs last year</span>
            </div>
          </CardContent>
        </Card>

        <MetricCard
          title="New Reviews"
          value={mockReviewStats.newReviewsThisPeriod.toString()}
          change={{
            value: `${Number(newReviewsChange) >= 0 ? '+' : ''}${newReviewsChange}%`,
            type: Number(newReviewsChange) >= 0 ? 'positive' : 'negative',
          }}
          icon="TrendingUp"
        />

        {/* Prometheus Insights */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 md:col-span-2 lg:col-span-2">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative h-full">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <h3 className="text-sm font-semibold">Prometheus Review Insights</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md bg-health-warning/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/></svg>
                </div>
                <p className="text-xs"><strong>Rating below target</strong> at 4.3 — aim for 4.5+</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-danger/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-danger">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/></svg>
                </div>
                <p className="text-xs"><strong>{mockReviewStats.negativeReviews} negative reviews</strong> — service complaints trending</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>Google dominates</strong> with 45% of reviews</p>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-health-excellent/10 p-2">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-health-excellent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs"><strong>Review volume up 21%</strong> vs last year</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Charts Section */}
      <SectionHeader
        title="Rating Breakdown"
        description="Rating trends and distribution analysis"
      />

      {/* Row 1: Average Rating, Reviews by Source */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CumulativeRatingChart
          title="Total Reviews"
          description="Cumulative review count over 24 months"
          data={mockCumulativeRatingChart}
        />

        <DonutChart
          title="Reviews by Source"
          description="Distribution across review platforms"
          data={mockReviewsBySource}
          centerValue={mockReviewStats.totalReviews.toLocaleString()}
          centerLabel="Total Reviews"
        />
      </div>

      {/* Row 2: Reviews by Rating Stacked */}
      <div className="grid gap-6">
        <StackedBar
          title="Reviews by Rating"
          description="Monthly breakdown by star rating (last 6 months)"
          data={mockReviewsByRatingChart}
          segments={mockRatingSegments}
          format="number"
          xAxisKey="month"
          healthScore={getMetricScore('Reviews')}
          healthScorePosition="header"
        />
      </div>

      {/* Negative Reviews Trend Section */}
      <SectionHeader
        title="Negative Review Trend"
        description="Track 1-3 star reviews over time"
      />

      <div className="grid gap-6">
        <TimeSeriesLine
          title="Negative Reviews - 12 Month Trend"
          description="Monthly count of 1-3 star reviews (lower is better)"
          data={mockNegativeReviewsTrend}
          format="number"
          goalLine={{
            value: 6,
            label: 'Target: Max 6',
            type: 'min',
          }}
          explanation="Negative reviews include 1, 2, and 3 star ratings. Target is to keep below 6 per month."
        />
      </div>
      </div>
    </div>
  )
}
