'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { US_STATES, US_TIMEZONES, CONCEPT_TYPES } from '@/lib/mock-data/settings'
import type { Location } from '@/types/settings'

interface LocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location?: Location | null
  onSave: (location: Partial<Location>) => void
}

export function LocationModal({
  open,
  onOpenChange,
  location,
  onSave,
}: LocationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: 'TX',
    zip: '',
    timezone: 'America/Chicago',
    conceptType: 'full_service',
    operatingHours: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        zip: location.zip,
        timezone: location.timezone,
        conceptType: location.conceptType,
        operatingHours: location.operatingHours || '',
      })
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        state: 'TX',
        zip: '',
        timezone: 'America/Chicago',
        conceptType: 'full_service',
        operatingHours: '',
      })
    }
  }, [location, open])

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    onSave(formData)
    setIsSaving(false)
    onOpenChange(false)
  }

  const isValid = formData.name && formData.address && formData.city && formData.state && formData.zip

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{location ? 'Edit Location' : 'Add Location'}</DialogTitle>
          <DialogDescription>
            {location
              ? 'Update the location details below.'
              : 'Add a new location to your organization.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Location Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Location Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Downtown Location"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">
              Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3 space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="San Antonio"
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="state">
                State <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="zip">
                Zip <span className="text-destructive">*</span>
              </Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="78215"
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">
              Timezone <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {US_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Concept Type */}
          <div className="space-y-2">
            <Label htmlFor="conceptType">Concept Type</Label>
            <Select
              value={formData.conceptType}
              onValueChange={(value) => setFormData({ ...formData, conceptType: value })}
            >
              <SelectTrigger id="conceptType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONCEPT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operating Hours */}
          <div className="space-y-2">
            <Label htmlFor="operatingHours">Operating Hours (optional)</Label>
            <Input
              id="operatingHours"
              value={formData.operatingHours}
              onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
              placeholder="Mon-Thu: 11am-10pm, Fri-Sat: 11am-11pm, Sun: 10am-9pm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? 'Saving...' : location ? 'Save Changes' : 'Save Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
