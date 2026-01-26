'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { mockNotificationPreferences } from '@/lib/mock-data/settings'
import type { NotificationPreferences } from '@/types/settings'

type NotificationKey = 'weeklyDigest' | 'intelligenceAlerts' | 'newReviews' | 'syncFailures'

interface NotificationRow {
  key: NotificationKey
  label: string
  description: string
}

const notificationRows: NotificationRow[] = [
  {
    key: 'weeklyDigest',
    label: 'Weekly Digest',
    description: 'Summary of KPIs and trends every Monday morning',
  },
  {
    key: 'intelligenceAlerts',
    label: 'Intelligence Alerts',
    description: 'Get notified when Intelligence detects issues',
  },
  {
    key: 'newReviews',
    label: 'New Reviews',
    description: 'Get notified when new reviews are received',
  },
  {
    key: 'syncFailures',
    label: 'Sync Failures',
    description: 'Get notified when data sync fails',
  },
]

export function NotificationsTab() {
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<NotificationPreferences>(mockNotificationPreferences)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = (key: NotificationKey, channel: 'email' | 'sms', checked: boolean) => {
    setPreferences({
      ...preferences,
      [key]: {
        ...preferences[key],
        [channel]: checked,
      },
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSaving(false)
    toast({
      title: 'Preferences saved',
      description: 'Your notification preferences have been updated.',
    })
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choose how you&apos;d like to receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Header Row */}
          <div className="grid grid-cols-[1fr,80px,80px] gap-4 pb-4 border-b mb-4">
            <div />
            <div className="text-center text-sm font-medium text-muted-foreground">Email</div>
            <div className="text-center text-sm font-medium text-muted-foreground">SMS</div>
          </div>

          {/* Notification Rows */}
          <div className="space-y-4">
            {notificationRows.map((row) => (
              <div key={row.key} className="grid grid-cols-[1fr,80px,80px] gap-4 items-center">
                <div className="space-y-0.5">
                  <Label className="font-medium">{row.label}</Label>
                  <p className="text-sm text-muted-foreground">{row.description}</p>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={preferences[row.key].email}
                    onCheckedChange={(checked) => handleToggle(row.key, 'email', checked)}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={preferences[row.key].sms}
                    onCheckedChange={(checked) => handleToggle(row.key, 'sms', checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Thresholds</CardTitle>
          <CardDescription>
            Set thresholds for automated alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sales Decline Alert */}
          <div className="space-y-3">
            <Label>Sales Decline Alert</Label>
            <p className="text-sm text-muted-foreground">
              Alert when sales drop more than:
            </p>
            <Select
              value={preferences.salesDeclineThreshold.toString()}
              onValueChange={(value) =>
                setPreferences({ ...preferences, salesDeclineThreshold: parseInt(value) })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5%</SelectItem>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="15">15%</SelectItem>
                <SelectItem value="20">20%</SelectItem>
                <SelectItem value="25">25%</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Compared to:</p>
              <RadioGroup
                value={preferences.salesDeclineComparison}
                onValueChange={(value) =>
                  setPreferences({
                    ...preferences,
                    salesDeclineComparison: value as 'week' | 'year',
                  })
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="week" id="prior-week" />
                  <Label htmlFor="prior-week" className="font-normal">
                    Prior Week
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="year" id="prior-year" />
                  <Label htmlFor="prior-year" className="font-normal">
                    Prior Year
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Labor Cost Alert */}
          <div className="space-y-3">
            <Label>Labor Cost Alert</Label>
            <p className="text-sm text-muted-foreground">
              Alert when labor % exceeds:
            </p>
            <Select
              value={preferences.laborCostThreshold.toString()}
              onValueChange={(value) =>
                setPreferences({ ...preferences, laborCostThreshold: parseInt(value) })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30%</SelectItem>
                <SelectItem value="32">32%</SelectItem>
                <SelectItem value="35">35%</SelectItem>
                <SelectItem value="38">38%</SelectItem>
                <SelectItem value="40">40%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Review Rating Alert */}
          <div className="space-y-3">
            <Label>Review Rating Alert</Label>
            <p className="text-sm text-muted-foreground">
              Alert when a review is below:
            </p>
            <Select
              value={preferences.reviewRatingThreshold.toString()}
              onValueChange={(value) =>
                setPreferences({ ...preferences, reviewRatingThreshold: parseInt(value) })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 stars</SelectItem>
                <SelectItem value="3">3 stars</SelectItem>
                <SelectItem value="4">4 stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
