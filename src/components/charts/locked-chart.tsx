'use client'

import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface LockedChartProps {
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}

export function LockedChart({ title, description, className, children }: LockedChartProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="relative">
        {/* Blurred chart content */}
        <div className="pointer-events-none select-none blur-[3px]">
          {children}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-card/95 p-6 shadow-lg border">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Premium Feature</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Unlock AI-powered insights
              </p>
            </div>
            <Button size="sm" className="mt-2">
              Upgrade Plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
