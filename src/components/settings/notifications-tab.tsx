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

export function NotificationsTab() {
  const { toast } = useToast()
  const [preferences, setPreferences] = useState(mockNotificationPreferences)
  const [isSaving, setIsSaving] = useState(false)

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
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose which emails you&apos;d like to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-digest">Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Summary of KPIs and trends every Monday morning
              </p>
            </div>
            <Switch
              id="weekly-digest"
              checked={preferences.weeklyDigest}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, weeklyDigest: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="intelligence-alerts">Intelligence Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when Intelligence detects issues
              </p>
            </div>
            <Switch
              id="intelligence-alerts"
              checked={preferences.intelligenceAlerts}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, intelligenceAlerts: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-reviews">New Reviews</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new reviews are received
              </p>
            </div>
            <Switch
              id="new-reviews"
              checked={preferences.newReviews}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, newReviews: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sync-failures">Sync Failures</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when data sync fails
              </p>
            </div>
            <Switch
              id="sync-failures"
              checked={preferences.syncFailures}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, syncFailures: checked })
              }
            />
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
