'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthScoreBox } from './health-score-box'
import { Sparkline } from './sparkline'

interface ComparativeBarData {
  label: string
  value: number
  isTarget?: boolean
  year?: number
}

interface HealthScoreInfo {
  percentage: number
  score: number
  maxScore: number
  trendData?: number[]
}

interface ComparativeBarCostProps {
  title: string
  description?: string
  data: ComparativeBarData[]
  format?: 'currency' | 'percent' | 'number'
  targetValue?: number
  healthScore?: HealthScoreInfo
  healthScorePosition?: 'header' | 'bottom'
  explanation?: string
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

// For cost metrics: LOWER is better, so color logic is inverted
function getBarColor(item: ComparativeBarData, data: ComparativeBarData[], targetValue?: number): string {
  // Find the most recent year in the data (excluding targets)
  const years = data.filter(d => d.year && !d.isTarget).map(d => d.year as number)
  const maxYear = Math.max(...years)

  // Current year actual - color based on performance vs target (inverted for costs)
  if (item.year === maxYear && !item.isTarget && targetValue !== undefined) {
    // For costs: if actual <= target, that's GOOD (green)
    // if actual > target, that's BAD (red/orange)
    if (item.value <= targetValue) {
      return '#16A249' // Green - good (at or under target)
    } else if (item.value <= targetValue * 1.05) {
      return '#FF9900' // Orange - slightly over
    } else {
      return '#EF4444' // Red - significantly over
    }
  }

  // Target bar - muted gray
  if (item.isTarget) {
    return '#94A3B8' // Slate gray
  }

  // Prior years - muted colors
  if (item.year && item.year < maxYear) {
    return item.year === maxYear - 1
      ? '#FFB2C1' // Muted pink (prior year)
      : '#B8D4E8' // Muted blue (2 years ago)
  }

  return '#16A249'
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

export function ComparativeBarCost({
  title,
  description,
  data,
  format = 'percent',
  targetValue,
  healthScore,
  healthScorePosition = 'bottom',
  explanation,
}: ComparativeBarCostProps) {
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
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatValue(value, format)}
                width={50}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as ComparativeBarData
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-lg font-bold tabular-nums">
                        {formatValue(item.value, format)}
                      </p>
                      {targetValue && !item.isTarget && (
                        <p className="text-sm text-muted-foreground">
                          {item.value <= targetValue ? (
                            <span className="text-health-excellent">
                              {((targetValue - item.value) / targetValue * 100).toFixed(1)}% under target
                            </span>
                          ) : (
                            <span className="text-health-danger">
                              {((item.value - targetValue) / targetValue * 100).toFixed(1)}% over target
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry, data, targetValue)} />
                ))}
              </Bar>
            </BarChart>
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
