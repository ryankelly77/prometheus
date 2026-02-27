'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Integration } from '@/types/settings'

// Integration logo config for fallback styling
const logoConfig: Record<Integration['type'], { bg: string; text: string; label: string }> = {
  toast: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Toast' },
  square: { bg: 'bg-black', text: 'text-white', label: 'Sq' },
  r365: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'R365' },
  marginedge: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'ME' },
  opentable: { bg: 'bg-red-100', text: 'text-red-600', label: 'OT' },
  resy: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Resy' },
  tock: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Tock' },
  brightlocal_reviews: { bg: 'bg-indigo-100', text: 'text-indigo-600', label: 'BL' },
  brightlocal_local: { bg: 'bg-indigo-100', text: 'text-indigo-600', label: 'BL' },
  semrush: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'SEMr' },
  sprout: { bg: 'bg-green-100', text: 'text-green-600', label: 'Sprout' },
  metricool: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'MC' },
}

// Integration logo with SVG support and fallback
const IntegrationLogo = ({
  type,
  logoUrl,
  className,
}: {
  type: Integration['type']
  logoUrl?: string
  className?: string
}) => {
  const [hasError, setHasError] = useState(false)
  const config = logoConfig[type]
  const size = className?.includes('h-8') ? 32 : 48

  // Try to load SVG logo, fallback to colored box
  if (logoUrl && !hasError) {
    return (
      <div className={cn('relative overflow-hidden rounded-lg', className || 'h-12 w-12')}>
        <Image
          src={logoUrl}
          alt={config.label}
          width={size}
          height={size}
          className="object-contain"
          onError={() => setHasError(true)}
        />
      </div>
    )
  }

  // Fallback to colored text box
  return (
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-lg text-xs font-bold',
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </div>
  )
}

interface UserIntegrationCardProps {
  integration: Integration
  onConnect: (integration: Integration) => void
  onReconnect: (integration: Integration) => void
  onDisconnect: (integration: Integration) => void
  onViewData: (integration: Integration) => void
  onAddConnection?: (integration: Integration) => void
}

export function UserIntegrationCard({
  integration,
  onConnect,
  onReconnect,
  onDisconnect,
  onViewData,
  onAddConnection,
}: UserIntegrationCardProps) {
  const statusConfig = {
    connected: {
      label: 'Connected',
      color: 'text-green-600',
      dot: 'bg-green-600',
    },
    available: {
      label: 'Available',
      color: 'text-muted-foreground',
      dot: 'bg-muted-foreground',
    },
    active: {
      label: 'Active',
      color: 'text-green-600',
      dot: 'bg-green-600',
    },
    error: {
      label: 'Error',
      color: 'text-amber-600',
      dot: 'bg-amber-600',
    },
  }

  const status = statusConfig[integration.status]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <IntegrationLogo type={integration.type} logoUrl={integration.logoUrl} />
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{integration.name}</h3>
                <span className={cn('flex items-center gap-1.5 text-sm', status.color)}>
                  <span className={cn('h-2 w-2 rounded-full', status.dot)} />
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
              {integration.status === 'connected' && integration.connectedLocationName && (
                <p className="text-xs text-muted-foreground">
                  Connected to <span className="font-medium">{integration.connectedLocationName}</span>
                  {integration.lastSyncAt && (
                    <span> · Last activity {formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })}</span>
                  )}
                </p>
              )}
              {integration.status === 'connected' && !integration.connectedLocationName && integration.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last activity {formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })}
                </p>
              )}
              {integration.status === 'error' && integration.errorMessage && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  {integration.errorMessage}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {integration.status === 'connected' && (
              <>
                <Button variant="outline" size="sm" onClick={() => onViewData(integration)}>
                  View Data
                </Button>
                {onAddConnection && (
                  <Button variant="outline" size="sm" onClick={() => onAddConnection(integration)}>
                    Add Connection
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => onReconnect(integration)}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Sync
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDisconnect(integration)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Disconnect
                </Button>
              </>
            )}
            {integration.status === 'error' && (
              <>
                <Button variant="outline" size="sm" onClick={() => onReconnect(integration)}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Reconnect
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDisconnect(integration)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Disconnect
                </Button>
              </>
            )}
            {integration.status === 'available' && (
              <Button size="sm" onClick={() => onConnect(integration)}>
                Connect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ManagedIntegrationCardProps {
  integration: Integration
  onViewData: (integration: Integration) => void
}

export function ManagedIntegrationCard({
  integration,
  onViewData,
}: ManagedIntegrationCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <IntegrationLogo type={integration.type} logoUrl={integration.logoUrl} />
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{integration.name}</h3>
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  Active
                </span>
              </div>
              {integration.poweredBy && (
                <p className="text-sm text-muted-foreground">
                  Powered by {integration.poweredBy}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{integration.description}</p>
              {integration.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Included with Pro Plan
            </div>
            <Button variant="outline" size="sm" onClick={() => onViewData(integration)}>
              View Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SocialChoiceCardProps {
  metricool: Integration
  sprout: Integration
  selectedMethod: 'managed' | 'byoa'
  onMethodChange: (method: 'managed' | 'byoa') => void
  onConnectSprout: () => void
  onViewData: (integration: Integration) => void
}

export function SocialChoiceCard({
  metricool,
  sprout,
  selectedMethod,
  onMethodChange,
  onConnectSprout,
  onViewData,
}: SocialChoiceCardProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose how to connect your social data:
      </p>

      {/* Managed Option - Metricool */}
      <Card
        className={cn(
          'cursor-pointer transition-colors',
          selectedMethod === 'managed'
            ? 'border-primary bg-primary/[0.02]'
            : 'hover:border-muted-foreground/50'
        )}
        onClick={() => onMethodChange('managed')}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                selectedMethod === 'managed'
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50'
              )}
            >
              {selectedMethod === 'managed' && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">Use Prometheus Social Tracking</h4>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Recommended
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <IntegrationLogo type="metricool" logoUrl={metricool.logoUrl} className="h-8 w-8 text-[10px]" />
                    <div>
                      <p className="text-sm text-muted-foreground">Powered by Metricool</p>
                      <p className="text-sm text-muted-foreground">
                        {metricool.description}
                      </p>
                    </div>
                  </div>
                  {selectedMethod === 'managed' && metricool.lastSyncAt && (
                    <p className="text-xs text-muted-foreground">
                      Last sync: {formatDistanceToNow(new Date(metricool.lastSyncAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
                {selectedMethod === 'managed' && (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      Active
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewData(metricool)
                      }}
                    >
                      View Data
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-green-600">
                Included with Pro Plan — we handle everything
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BYOA Option - Sprout Social */}
      <Card
        className={cn(
          'cursor-pointer transition-colors',
          selectedMethod === 'byoa'
            ? 'border-primary bg-primary/[0.02]'
            : 'hover:border-muted-foreground/50'
        )}
        onClick={() => onMethodChange('byoa')}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                selectedMethod === 'byoa'
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50'
              )}
            >
              {selectedMethod === 'byoa' && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold">Connect Your Own Sprout Social</h4>
                  <div className="flex items-center gap-3">
                    <IntegrationLogo type="sprout" logoUrl={sprout.logoUrl} className="h-8 w-8 text-[10px]" />
                    <div>
                      <p className="text-sm font-medium">{sprout.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {sprout.description}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedMethod === 'byoa' && (
                  <div className="flex flex-col items-end gap-2">
                    {sprout.status === 'connected' ? (
                      <>
                        <div className="flex items-center gap-1.5 text-sm text-green-600">
                          <Check className="h-4 w-4" />
                          Connected
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewData(sprout)
                          }}
                        >
                          View Data
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onConnectSprout()
                        }}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
