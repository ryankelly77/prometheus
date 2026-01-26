'use client'

import { Check, Loader2, Circle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RunningStep {
  name: string
  status: 'complete' | 'current' | 'pending'
}

interface RunningStateProps {
  reportTitle: string
  progress: number
  currentStep: string
  steps: RunningStep[]
  onCancel: () => void
}

export function RunningState({
  reportTitle,
  progress,
  currentStep,
  steps,
  onCancel,
}: RunningStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {/* Spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-muted" />
              <div
                className="absolute inset-0 h-20 w-20 rounded-full border-4 border-primary border-t-transparent animate-spin"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold tabular-nums">{progress}%</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-center mb-2">{reportTitle}</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">{currentStep}</p>

          {/* Progress Bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-6">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {step.status === 'complete' && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-health-excellent text-white">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                {step.status === 'current' && (
                  <div className="flex h-5 w-5 items-center justify-center">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                )}
                {step.status === 'pending' && (
                  <Circle className="h-5 w-5 text-muted-foreground/30" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    step.status === 'complete' && 'text-foreground',
                    step.status === 'current' && 'text-primary font-medium',
                    step.status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </span>
              </div>
            ))}
          </div>

          {/* Cancel Button */}
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
