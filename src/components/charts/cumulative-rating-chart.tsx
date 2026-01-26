'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthScoreBox } from './health-score-box'
import { Star } from 'lucide-react'

interface CumulativeReviewData {
  month: string
  avgRating: number
  totalReviews: number
  newReviews: number
}

interface HealthScoreInfo {
  percentage: number
  score: number
  maxScore: number
  trendData?: number[]
}

interface CumulativeRatingChartProps {
  title: string
  description?: string
  data: CumulativeReviewData[]
  healthScore?: HealthScoreInfo
  explanation?: string
}

export function CumulativeRatingChart({
  title,
  description,
  data,
  healthScore,
  explanation,
}: CumulativeRatingChartProps) {
  // Calculate domain for Y axis based on total reviews
  const minReviews = Math.min(...data.map(d => d.totalReviews))
  const maxReviews = Math.max(...data.map(d => d.totalReviews))
  const padding = Math.ceil((maxReviews - minReviews) * 0.1)
  const yMin = Math.max(0, minReviews - padding)
  const yMax = maxReviews + padding

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="h-[200px] flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value.toLocaleString()}
                width={45}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const data = payload[0].payload as CumulativeReviewData
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium mb-2">{label}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span className="font-semibold text-lg tabular-nums">{data.avgRating.toFixed(2)}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">avg rating</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">New Reviews:</span>
                          <span className="font-medium tabular-nums text-health-excellent">+{data.newReviews}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="totalReviews"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-primary" />
            <span className="text-xs text-muted-foreground">Total Reviews</span>
          </div>
        </div>

        {healthScore && (
          <HealthScoreBox
            percentage={healthScore.percentage}
            score={healthScore.score}
            maxScore={healthScore.maxScore}
            trendData={healthScore.trendData}
          />
        )}

        {explanation && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="mr-1">ℹ️</span>
            {explanation}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
