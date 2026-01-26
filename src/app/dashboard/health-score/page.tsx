'use client'

import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Check, AlertCircle, RotateCcw, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'

// Weight constraint type
interface WeightConstraint {
  default: number
  min: number
  max: number
  category: 'core' | 'customer' | 'beverage' | 'marketing'
  label: string
  canDisable?: boolean
  toggleKey?: ToggleKey
}

// Toggle keys type
type ToggleKey = 'alcohol' | 'beer' | 'wine' | 'pr' | 'visibility'

// Weight constraints from spec
const weightConstraints: Record<string, WeightConstraint> = {
  // Core Metrics (75% total)
  totalSales:      { default: 25, min: 22, max: 28, category: 'core', label: 'Total Sales' },
  primeCost:       { default: 17, min: 17, max: 23, category: 'core', label: 'Prime Cost' },
  foodSales:       { default: 15, min: 12, max: 18, category: 'core', label: 'Food Sales' },
  laborCosts:      { default: 10, min: 8,  max: 12, category: 'core', label: 'Labor Costs' },
  foodCosts:       { default: 8,  min: 8,  max: 12, category: 'core', label: 'Food Costs' },

  // Customer Metrics (15% total)
  ppa:             { default: 8,  min: 3,  max: 10, category: 'customer', label: 'PPA' },
  customerLoyalty: { default: 7,  min: 3,  max: 10, category: 'customer', label: 'Customer Loyalty' },

  // Beverage Metrics (5% total, can be disabled)
  wineSales:       { default: 2,  min: 0,  max: 6,  category: 'beverage', label: 'Wine Sales', canDisable: true, toggleKey: 'wine' },
  alcoholSales:    { default: 2,  min: 0,  max: 5,  category: 'beverage', label: 'Alcohol Sales', canDisable: true, toggleKey: 'alcohol' },
  beerSales:       { default: 1,  min: 0,  max: 5,  category: 'beverage', label: 'Beer Sales', canDisable: true, toggleKey: 'beer' },

  // Marketing Metrics (5% total)
  reviews:         { default: 2,  min: 1,  max: 4,  category: 'marketing', label: 'Reviews' },
  prMentions:      { default: 2,  min: 0,  max: 3,  category: 'marketing', label: 'PR Mentions', canDisable: true, toggleKey: 'pr' },
  websiteVisibility: { default: 1, min: 0, max: 3,  category: 'marketing', label: 'Website Visibility', canDisable: true, toggleKey: 'visibility' },
}

type MetricKey = keyof typeof weightConstraints

// Toggle configuration
const toggleConfig: Array<{ key: ToggleKey; label: string; metric: string }> = [
  { key: 'alcohol', label: 'We serve alcohol (spirits)', metric: 'alcoholSales' },
  { key: 'beer', label: 'We serve beer', metric: 'beerSales' },
  { key: 'wine', label: 'We serve wine', metric: 'wineSales' },
  { key: 'pr', label: 'We track PR mentions', metric: 'prMentions' },
  { key: 'visibility', label: 'We track website visibility', metric: 'websiteVisibility' },
]

// Category configuration
const categories = [
  { key: 'core', label: 'Core Metrics', description: 'Fundamental business performance indicators' },
  { key: 'customer', label: 'Customer Metrics', description: 'Customer behavior and satisfaction' },
  { key: 'beverage', label: 'Beverage Metrics', description: 'Beverage sales performance' },
  { key: 'marketing', label: 'Marketing Metrics', description: 'Marketing and visibility metrics' },
] as const

// Get default weights
function getDefaultWeights(): Record<MetricKey, number> {
  const weights: Record<string, number> = {}
  for (const [key, config] of Object.entries(weightConstraints)) {
    weights[key] = config.default
  }
  return weights as Record<MetricKey, number>
}

// Get default toggles
function getDefaultToggles(): Record<ToggleKey, boolean> {
  return {
    alcohol: true,
    beer: true,
    wine: true,
    pr: true,
    visibility: true,
  }
}

// Redistribution logic
function redistributeWeight(
  disabledMetric: MetricKey,
  weights: Record<MetricKey, number>,
  toggles: Record<ToggleKey, boolean>
): Record<MetricKey, number> {
  const weightToRedistribute = weights[disabledMetric]
  const newWeights = { ...weights, [disabledMetric]: 0 }

  const constraint = weightConstraints[disabledMetric]

  // Determine recipients based on category
  let recipients: MetricKey[] = []

  if (constraint.category === 'beverage') {
    // Try to redistribute to other beverages first
    const otherBeverages: MetricKey[] = ['wineSales', 'alcoholSales', 'beerSales']
      .filter(m => m !== disabledMetric && toggles[weightConstraints[m as MetricKey].toggleKey as ToggleKey]) as MetricKey[]

    if (otherBeverages.length > 0) {
      recipients = otherBeverages
    } else {
      // No other beverages enabled, redistribute to food sales, PPA, customer loyalty
      recipients = ['foodSales', 'ppa', 'customerLoyalty']
    }
  } else if (constraint.category === 'marketing') {
    // Try to redistribute to other marketing metrics
    const otherMarketing: MetricKey[] = ['reviews', 'prMentions', 'websiteVisibility']
      .filter(m => {
        if (m === disabledMetric) return false
        const c = weightConstraints[m as MetricKey]
        if (c.canDisable && c.toggleKey) {
          return toggles[c.toggleKey as ToggleKey]
        }
        return true
      }) as MetricKey[]

    if (otherMarketing.length > 0) {
      recipients = otherMarketing
    } else {
      // All goes to reviews if it's the only one
      recipients = ['reviews']
    }
  }

  // Distribute equally among recipients
  if (recipients.length > 0) {
    const perRecipient = weightToRedistribute / recipients.length

    for (const recipient of recipients) {
      const recipientConstraint = weightConstraints[recipient]
      const newValue = Math.min(
        newWeights[recipient] + perRecipient,
        recipientConstraint.max
      )
      // Round to nearest 0.5
      newWeights[recipient] = Math.round(newValue * 2) / 2
    }
  }

  return newWeights
}

export default function HealthScoreConfigPage() {
  const [weights, setWeights] = useState<Record<MetricKey, number>>(getDefaultWeights)
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>(getDefaultToggles)
  const [isDirty, setIsDirty] = useState(false)

  // Calculate total
  const total = useMemo(() => {
    return Object.values(weights).reduce((sum, w) => sum + w, 0)
  }, [weights])

  const isValid = Math.abs(total - 100) < 0.01
  const canSave = isValid && isDirty

  // Handle weight change
  const handleWeightChange = useCallback((metric: MetricKey, value: number) => {
    const constraint = weightConstraints[metric]

    // Snap to 0.5 increments
    const snappedValue = Math.round(value * 2) / 2

    // Check bounds
    if (snappedValue < constraint.min) {
      toast.error(`${constraint.label} cannot go below ${constraint.min}%`)
      return
    }
    if (snappedValue > constraint.max) {
      toast.error(`${constraint.label} cannot exceed ${constraint.max}%`)
      return
    }

    setWeights(prev => ({ ...prev, [metric]: snappedValue }))
    setIsDirty(true)
  }, [])

  // Handle toggle change
  const handleToggleChange = useCallback((toggleKey: ToggleKey, checked: boolean) => {
    setToggles(prev => ({ ...prev, [toggleKey]: checked }))

    // Find the metric associated with this toggle
    const toggleInfo = toggleConfig.find(t => t.key === toggleKey)
    if (!toggleInfo) return

    const metric = toggleInfo.metric as MetricKey

    if (!checked) {
      // Redistribute weight when disabling
      setWeights(prev => redistributeWeight(metric, prev, { ...toggles, [toggleKey]: false }))
      toast.info(`${weightConstraints[metric].label} disabled. Weight redistributed.`)
    } else {
      // Restore default weight when enabling
      const defaultWeight = weightConstraints[metric].default
      setWeights(prev => ({ ...prev, [metric]: defaultWeight }))
      toast.info(`${weightConstraints[metric].label} enabled with ${defaultWeight}% weight.`)
    }

    setIsDirty(true)
  }, [toggles])

  // Reset to defaults
  const handleReset = useCallback(() => {
    setWeights(getDefaultWeights())
    setToggles(getDefaultToggles())
    setIsDirty(false)
    toast.success('Weights reset to defaults')
  }, [])

  // Save configuration
  const handleSave = useCallback(() => {
    if (!canSave) return

    console.log('Saving configuration:', { weights, toggles })
    toast.success('Configuration saved successfully')
    setIsDirty(false)
  }, [canSave, weights, toggles])

  // Get metrics for a category
  const getMetricsForCategory = (category: string) => {
    return Object.entries(weightConstraints)
      .filter(([_, config]) => config.category === category)
      .map(([key]) => key as MetricKey)
  }

  // Calculate category total
  const getCategoryTotal = (category: string) => {
    const metrics = getMetricsForCategory(category)
    return metrics.reduce((sum, metric) => sum + weights[metric], 0)
  }

  // Get the max slider value for a category (highest max among all metrics)
  const getCategorySliderMax = (category: string) => {
    const metrics = getMetricsForCategory(category)
    return Math.max(...metrics.map(m => weightConstraints[m].max))
  }

  // Check if metric is disabled
  const isMetricDisabled = (metric: MetricKey) => {
    const config = weightConstraints[metric]
    if (config.canDisable && config.toggleKey) {
      return !toggles[config.toggleKey as ToggleKey]
    }
    return false
  }

  return (
    <div className="pb-24">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Health Score Configuration</h1>
        <p className="text-muted-foreground">
          Customize how your health score is calculated by adjusting metric weights.
        </p>
      </div>

      {/* Restaurant Configuration Toggles */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Restaurant Configuration</CardTitle>
          <CardDescription>
            Toggle off metrics that don&apos;t apply to your restaurant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toggleConfig.map((toggle) => (
              <div
                key={toggle.key}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <label
                  htmlFor={toggle.key}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {toggle.label}
                </label>
                <Switch
                  id={toggle.key}
                  checked={toggles[toggle.key]}
                  onCheckedChange={(checked) => handleToggleChange(toggle.key, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weight Configuration by Category */}
      <div className="space-y-6">
        {categories.map((category) => {
          const metrics = getMetricsForCategory(category.key)
          const sliderMax = getCategorySliderMax(category.key)

          return (
            <Card key={category.key}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{category.label}</CardTitle>
                  <span className="text-lg font-semibold tabular-nums text-primary">
                    {getCategoryTotal(category.key).toFixed(1)}%
                  </span>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {metrics.map((metric) => {
                  const config = weightConstraints[metric]
                  const disabled = isMetricDisabled(metric)
                  const value = weights[metric]

                  return (
                    <div
                      key={metric}
                      className={`space-y-2 ${disabled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          {config.label}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => handleWeightChange(metric, parseFloat(e.target.value) || 0)}
                            disabled={disabled}
                            step={0.5}
                            min={config.min}
                            max={config.max}
                            className="h-8 w-16 rounded-md border bg-background px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={([newValue]) => handleWeightChange(metric, newValue)}
                        min={0}
                        max={sliderMax}
                        step={0.5}
                        disabled={disabled}
                        aria-label={`${config.label} weight`}
                        className="cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Min: {config.min}%</span>
                        <span>Max: {config.max}%</span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Total:</span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                isValid ? 'text-health-excellent' : 'text-health-danger'
              }`}
            >
              {total.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            {isValid ? (
              <div className="flex items-center gap-1 text-health-excellent">
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">Valid</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-health-danger">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {total < 100 ? `Need ${(100 - total).toFixed(1)}% more` : `${(total - 100).toFixed(1)}% over`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
