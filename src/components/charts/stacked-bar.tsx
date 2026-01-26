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
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthScoreBox } from './health-score-box'
import { Sparkline } from './sparkline'

interface SegmentConfig {
  key: string
  label: string
  color: string
}

interface HealthScoreInfo {
  percentage: number
  score: number
  maxScore: number
  trendData?: number[]
}

interface GoalLineConfig {
  value: number
  label: string
  type?: 'max' | 'min'
}

interface StackedBarProps {
  title: string
  description?: string
  data: Record<string, unknown>[]
  segments: SegmentConfig[]
  format?: 'currency' | 'percent' | 'number'
  healthScore?: HealthScoreInfo
  healthScorePosition?: 'header' | 'bottom'
  explanation?: string
  useYearColors?: boolean
  goalLine?: GoalLineConfig
  xAxisKey?: string
  hideLegend?: boolean
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

// Year-based color scheme matching comparative bar charts
function getYearColor(label: string, segmentIndex: number, totalSegments: number): string {
  const baseColors = {
    current: ['#FF9900', '#FFB84D', '#FFCC80'],      // Orange shades for current year
    target: ['#FFD699', '#FFE4B8', '#FFF0D6'],       // Muted orange for target
    lastYear: ['#FFB2C1', '#FFC9D4', '#FFE0E7'],     // Muted pink for last year
    older: ['#B8D4E8', '#CEE2EF', '#E4F0F6'],        // Muted blue for older
  }

  const labelLower = label.toLowerCase()
  let colors: string[]

  if (labelLower.includes('target')) {
    colors = baseColors.target
  } else if (labelLower.includes('2025')) {
    colors = baseColors.current
  } else if (labelLower.includes('2024')) {
    colors = baseColors.lastYear
  } else {
    colors = baseColors.older
  }

  // Return color based on segment position (darker for first segment, lighter for last)
  return colors[Math.min(segmentIndex, colors.length - 1)]
}

export function StackedBar({
  title,
  description,
  data,
  segments,
  format = 'currency',
  healthScore,
  healthScorePosition = 'bottom',
  explanation,
  useYearColors = false,
  goalLine,
  xAxisKey = 'label',
  hideLegend = false,
}: StackedBarProps) {
  return (
    <Card className="flex h-full flex-col">
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
      <CardContent className="flex flex-1 flex-col">
        <div className={data.length > 6 ? "h-[320px]" : "h-[200px] flex-1 min-h-[200px]"}>
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
                dataKey={xAxisKey}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatValue(value, format)}
                width={70}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const total = payload.reduce(
                    (sum, entry) => sum + (Number(entry.value) || 0),
                    0
                  )
                  // Reverse payload to match visual stack order (top to bottom)
                  const reversedPayload = [...payload].reverse()
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="mb-2 font-medium">{label}</p>
                      {reversedPayload.map((entry, index) => {
                        // Calculate original index for year colors (reversed)
                        const originalIndex = payload.length - 1 - index
                        return (
                          <div
                            key={entry.dataKey}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: useYearColors
                                  ? getYearColor(label as string, originalIndex, segments.length)
                                  : entry.color
                              }}
                            />
                            <span>{entry.name}:</span>
                            <span className="font-medium tabular-nums">
                              {formatValue(Number(entry.value) || 0, format)}
                            </span>
                          </div>
                        )
                      })}
                      <div className="mt-2 border-t pt-2">
                        <span className="font-medium">Total: </span>
                        <span className="font-bold tabular-nums">
                          {formatValue(total, format)}
                        </span>
                      </div>
                    </div>
                  )
                }}
              />
              {segments.map((segment, segmentIndex) => (
                <Bar
                  key={segment.key}
                  dataKey={segment.key}
                  name={segment.label}
                  stackId="stack"
                  fill={segment.color}
                  radius={[0, 0, 0, 0]}
                  maxBarSize={60}
                >
                  {useYearColors && data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getYearColor(entry.label as string, segmentIndex, segments.length)}
                    />
                  ))}
                </Bar>
              ))}
              {goalLine && (
                <ReferenceLine
                  y={goalLine.value}
                  stroke="#EF4444"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        {!hideLegend && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            {segments.map((segment) => (
              <div key={segment.key} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-xs text-muted-foreground">{segment.label}</span>
              </div>
            ))}
            {goalLine && (
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: '#EF4444' }} />
                <span className="text-xs text-muted-foreground">Target: {goalLine.value}</span>
              </div>
            )}
          </div>
        )}

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
