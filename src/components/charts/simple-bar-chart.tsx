'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthScoreBox } from './health-score-box'
import { Sparkline } from './sparkline'

interface DataPoint {
  date: string
  value: number
}

interface GoalLineConfig {
  value: number
  label?: string
}

interface HealthScoreInfo {
  percentage: number
  score: number
  maxScore: number
  trendData?: number[]
}

interface TrendLineConfig {
  show: boolean
  color?: string
  label?: string
}

interface SimpleBarChartProps {
  title: string
  description?: string
  data: DataPoint[]
  color?: string
  goalLine?: GoalLineConfig
  trendLine?: TrendLineConfig
  healthScore?: HealthScoreInfo
  healthScorePosition?: 'header' | 'bottom'
  explanation?: string
}

// Calculate linear regression for trend line
function calculateTrendLine(data: DataPoint[]): DataPoint[] {
  const n = data.length
  if (n < 2) return data

  // Calculate means
  const sumX = data.reduce((sum, _, i) => sum + i, 0)
  const sumY = data.reduce((sum, d) => sum + d.value, 0)
  const meanX = sumX / n
  const meanY = sumY / n

  // Calculate slope and intercept
  let numerator = 0
  let denominator = 0
  data.forEach((d, i) => {
    numerator += (i - meanX) * (d.value - meanY)
    denominator += (i - meanX) ** 2
  })

  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = meanY - slope * meanX

  // Generate trend line points
  return data.map((d, i) => ({
    ...d,
    trend: Math.round(slope * i + intercept),
  }))
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

export function SimpleBarChart({
  title,
  description,
  data,
  color = '#D8B4FE',
  goalLine,
  trendLine,
  healthScore,
  healthScorePosition = 'bottom',
  explanation,
}: SimpleBarChartProps) {
  // Calculate trend line data if enabled
  const chartData = trendLine?.show ? calculateTrendLine(data) : data

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
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 10, bottom: 20, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as DataPoint & { trend?: number }
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="text-sm text-muted-foreground">{item.date}</p>
                      <p className="text-lg font-bold tabular-nums">{item.value}</p>
                      {item.trend !== undefined && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: trendLine?.color || '#F97316' }} />
                          <span>Trend: {item.trend}</span>
                        </div>
                      )}
                      {goalLine && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="inline-block w-4 border-t-2" style={{ borderColor: '#22C55E' }} />
                          <span>Goal: {goalLine.value}</span>
                        </div>
                      )}
                    </div>
                  )
                }}
              />
              {goalLine && (
                <ReferenceLine
                  y={goalLine.value}
                  stroke="#22C55E"
                  strokeWidth={2}
                  label={goalLine.label ? {
                    value: goalLine.label,
                    position: 'right',
                    fill: '#22C55E',
                    fontSize: 11,
                  } : undefined}
                />
              )}
              <Bar
                dataKey="value"
                fill={color}
                radius={[2, 2, 0, 0]}
                maxBarSize={40}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="hsl(var(--muted-foreground))"
                  fontSize={10}
                />
              </Bar>
              {trendLine?.show && (
                <Line
                  type="linear"
                  dataKey="trend"
                  stroke={trendLine.color || '#F97316'}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
              )}
            </ComposedChart>
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
