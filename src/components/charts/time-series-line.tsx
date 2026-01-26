'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthScoreBox } from './health-score-box'
import { Sparkline } from './sparkline'

interface TimeSeriesData {
  date: string
  value: number
}

interface GoalLine {
  value: number
  label: string
  type: 'min' | 'max' // min = lower is better (costs), max = higher is better (revenue)
}

interface HealthScoreInfo {
  percentage: number
  score: number
  maxScore: number
  trendData?: number[]
}

interface TimeSeriesLineProps {
  title: string
  description?: string
  data: TimeSeriesData[]
  format?: 'currency' | 'percent' | 'number'
  goalLine?: GoalLine
  healthScore?: HealthScoreInfo
  healthScorePosition?: 'header' | 'bottom'
  explanation?: string
  color?: string
  height?: number
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    case 'percent':
      return `${value.toFixed(1)}%`
    default:
      return value.toLocaleString()
  }
}

function formatDateLabel(dateStr: string): string {
  // Handle YYYY-MM format
  if (dateStr.match(/^\d{4}-\d{2}$/)) {
    const [year, month] = dateStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short' })
  }
  return dateStr
}

function getHealthBgColor(percentage: number): string {
  if (percentage >= 100) return '#16A249'
  if (percentage >= 90) return '#82CB15'
  if (percentage >= 80) return 'hsl(var(--health-warning))'
  return 'hsl(var(--health-danger))'
}

function HeaderHealthScore({ healthScore }: { healthScore: HealthScoreInfo }) {
  const displayPercentage = Math.round(healthScore.percentage)

  return (
    <div className="flex items-center gap-2">
      {healthScore.trendData && healthScore.trendData.length > 0 && (
        <div className="w-16">
          <Sparkline
            data={healthScore.trendData}
            color={getHealthBgColor(displayPercentage)}
            height={24}
          />
        </div>
      )}
      <div
        className="rounded-md px-2 py-0.5 text-sm font-bold tabular-nums"
        style={{ backgroundColor: getHealthBgColor(displayPercentage), color: 'white' }}
      >
        {displayPercentage}%
      </div>
      <div className="text-sm tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{healthScore.score.toFixed(1)}</span>
        <span> / {healthScore.maxScore}</span>
      </div>
    </div>
  )
}

export function TimeSeriesLine({
  title,
  description,
  data,
  format = 'number',
  goalLine,
  healthScore,
  healthScorePosition = 'bottom',
  explanation,
  color = 'hsl(var(--primary))',
  height = 200,
}: TimeSeriesLineProps) {
  // Generate unique gradient ID for this chart instance
  const gradientId = `gradient-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {healthScore && healthScorePosition === 'header' && (
            <HeaderHealthScore healthScore={healthScore} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                tickFormatter={formatDateLabel}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatValue(value, format)}
                width={60}
                domain={['auto', 'auto']}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as TimeSeriesData
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm text-muted-foreground">{item.date}</p>
                      <p className="text-lg font-bold tabular-nums">
                        {formatValue(item.value, format)}
                      </p>
                      {goalLine && (
                        <p className="text-sm text-muted-foreground">
                          Target: {formatValue(goalLine.value, format)}
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              {goalLine && (
                <ReferenceLine
                  y={goalLine.value}
                  stroke={
                    goalLine.type === 'max'
                      ? 'hsl(var(--health-excellent))'
                      : 'hsl(var(--health-danger))'
                  }
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: goalLine.label,
                    position: 'right',
                    fill:
                      goalLine.type === 'max'
                        ? 'hsl(var(--health-excellent))'
                        : 'hsl(var(--health-danger))',
                    fontSize: 11,
                  }}
                />
              )}
              <Area
                type="natural"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: color,
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {healthScore && healthScorePosition === 'bottom' && (
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
