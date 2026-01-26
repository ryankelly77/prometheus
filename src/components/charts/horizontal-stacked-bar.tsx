'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

interface HorizontalStackedBarProps {
  title: string
  description?: string
  data: Record<string, unknown>[]
  segments: SegmentConfig[]
  healthScore?: HealthScoreInfo
  healthScorePosition?: 'header' | 'bottom'
  explanation?: string
  targetLine?: { value: number; label: string }
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

export function HorizontalStackedBar({
  title,
  description,
  data,
  segments,
  healthScore,
  healthScorePosition = 'bottom',
  explanation,
  targetLine,
}: HorizontalStackedBarProps) {
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
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 30, bottom: 10, left: 80 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  // Reverse to show from top of stack to bottom
                  const reversedPayload = [...payload].reverse()
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="mb-2 font-medium">{label}</p>
                      {reversedPayload.map((entry) => (
                        <div
                          key={entry.dataKey}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: entry.color as string }}
                          />
                          <span>{entry.name}:</span>
                          <span className="font-medium tabular-nums">
                            {Number(entry.value).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              {segments.map((segment, index) => (
                <Bar
                  key={segment.key}
                  dataKey={segment.key}
                  name={segment.label}
                  stackId="stack"
                  fill={segment.color}
                  radius={index === segments.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                  barSize={50}
                />
              ))}
              {/* Target line reference */}
              {targetLine && (
                <ReferenceLine
                  x={targetLine.value}
                  stroke="#666666"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
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
          {targetLine && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 border-t-2 border-dashed border-muted-foreground" />
              <span className="text-xs text-muted-foreground">{targetLine.label}</span>
            </div>
          )}
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
