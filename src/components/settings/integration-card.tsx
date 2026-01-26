'use client'

import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Integration } from '@/types/settings'

// Integration logo components using colored icons/text
const IntegrationLogo = ({ type }: { type: Integration['type'] }) => {
  const logos: Record<Integration['type'], { bg: string; text: string; label: string }> = {
    toast: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Toast' },
    square: { bg: 'bg-black', text: 'text-white', label: 'Sq' },
    r365: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'R365' },
    opentable: { bg: 'bg-red-100', text: 'text-red-600', label: 'OT' },
    resy: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Resy' },
    brightlocal: { bg: 'bg-indigo-100', text: 'text-indigo-600', label: 'BL' },
    semrush: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'SEMr' },
    sprout: { bg: 'bg-green-100', text: 'text-green-600', label: 'Sprout' },
    metricool: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'MC' },
  }

  const logo = logos[type]

  return (
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-lg text-xs font-bold',
        logo.bg,
        logo.text
      )}
    >
      {logo.label}
    </div>
  )
}

interface IntegrationCardProps {
  integration: Integration
  onConnect: (integration: Integration) => void
  onReconnect: (integration: Integration) => void
  onDisconnect: (integration: Integration) => void
  onViewData: (integration: Integration) => void
}

export function IntegrationCard({
  integration,
  onConnect,
  onReconnect,
  onDisconnect,
  onViewData,
}: IntegrationCardProps) {
  const statusConfig = {
    connected: {
      label: 'Connected',
      color: 'text-green-600',
      dot: 'bg-green-600',
    },
    disconnected: {
      label: 'Not Connected',
      color: 'text-muted-foreground',
      dot: 'bg-muted-foreground',
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
            <IntegrationLogo type={integration.type} />
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{integration.name}</h3>
                <span className={cn('flex items-center gap-1.5 text-sm', status.color)}>
                  <span className={cn('h-2 w-2 rounded-full', status.dot)} />
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
              {integration.status === 'connected' && integration.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {formatDistanceToNow(new Date(integration.lastSyncAt), { addSuffix: true })}
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
            {integration.status === 'disconnected' && (
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
