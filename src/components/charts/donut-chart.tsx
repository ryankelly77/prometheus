'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthScoreBox } from './health-score-box'

interface DonutDataItem {
  name: string
  value: number
  color: string
}

interface HealthScoreInfo {
  percentage: number
  score: number
  maxScore: number
  trendData?: number[]
}

interface DonutChartProps {
  title: string
  description?: string
  data: DonutDataItem[]
  healthScore?: HealthScoreInfo
  explanation?: string
  showLegend?: boolean
  centerLabel?: string
  centerValue?: string | number
}

function formatNumber(value: number): string {
  return value.toLocaleString()
}

export function DonutChart({
  title,
  description,
  data,
  healthScore,
  explanation,
  showLegend = true,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="h-[200px] flex-1 min-h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as DonutDataItem
                  const percentage = ((item.value / total) * 100).toFixed(1)
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span className="font-semibold tabular-nums">{formatNumber(item.value)}</span>
                        {' '}({percentage}%)
                      </div>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          {(centerLabel || centerValue) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                {centerValue && (
                  <div className="text-2xl font-bold tabular-nums">{centerValue}</div>
                )}
                {centerLabel && (
                  <div className="text-xs text-muted-foreground">{centerLabel}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {data.map((item) => {
              const percentage = ((item.value / total) * 100).toFixed(0)
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {item.name}
                  </span>
                  <span className="ml-auto text-xs font-medium tabular-nums">
                    {percentage}%
                  </span>
                </div>
              )
            })}
          </div>
        )}

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
