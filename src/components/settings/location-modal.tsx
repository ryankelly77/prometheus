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

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
]

const CONCEPT_TYPES = [
  { value: 'full_service', label: 'Full Service Restaurant' },
  { value: 'fast_casual', label: 'Fast Casual' },
  { value: 'quick_service', label: 'Quick Service' },
  { value: 'fine_dining', label: 'Fine Dining' },
  { value: 'bar', label: 'Bar / Lounge' },
  { value: 'cafe', label: 'Cafe / Coffee Shop' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'catering', label: 'Catering' },
  { value: 'ghost_kitchen', label: 'Ghost Kitchen' },
  { value: 'other', label: 'Other' },
]

interface Location {
  id: string
  name: string
  neighborhood?: string
  address: string
  city: string
  state: string
  zip: string
  timezone: string
  conceptType?: string
  restaurantGroupId?: string
  isDefault?: boolean
}

interface RestaurantGroup {
  id: string
  name: string
}

interface LocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location?: Location | null
  onSave: (location: Partial<Location>) => void
  isSaving?: boolean
  restaurantGroups?: RestaurantGroup[]
}

export function LocationModal({
  open,
  onOpenChange,
  location,
  onSave,
  isSaving = false,
  restaurantGroups = [],
}: LocationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    neighborhood: '',
    address: '',
    city: '',
    state: 'TX',
    zip: '',
    timezone: 'America/Chicago',
    conceptType: 'full_service',
    restaurantGroupId: '',
    isDefault: false,
  })

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        neighborhood: location.neighborhood || '',
        address: location.address || '',
        city: location.city || '',
        state: location.state || 'TX',
        zip: location.zip || '',
        timezone: location.timezone || 'America/Chicago',
        conceptType: location.conceptType || 'full_service',
        restaurantGroupId: location.restaurantGroupId || restaurantGroups[0]?.id || '',
        isDefault: location.isDefault || false,
      })
    } else {
      setFormData({
        name: '',
        neighborhood: '',
        address: '',
        city: '',
        state: 'TX',
        zip: '',
        timezone: 'America/Chicago',
        conceptType: 'full_service',
        restaurantGroupId: restaurantGroups[0]?.id || '',
        isDefault: false,
      })
    }
  }, [location, open, restaurantGroups])

  const handleSave = () => {
    onSave(formData)
  }

  const isValid = formData.name.trim().length > 0

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
              placeholder="e.g., Boiler House"
            />
            <p className="text-xs text-muted-foreground">
              This is the display name shown throughout the app
            </p>
          </div>

          {/* Neighborhood / Area */}
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Neighborhood / Area</Label>
            <Input
              id="neighborhood"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="e.g., Pearl, The Rim, Downtown"
            />
            <p className="text-xs text-muted-foreground">
              Optional area name displayed with city on cards
            </p>
          </div>

          {/* Restaurant Group (only for new locations) */}
          {!location && restaurantGroups.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="restaurantGroup">Restaurant Group</Label>
              <Select
                value={formData.restaurantGroupId}
                onValueChange={(value) => setFormData({ ...formData, restaurantGroupId: value })}
              >
                <SelectTrigger id="restaurantGroup">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {restaurantGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="312 Pearl Pkwy"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3 space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="San Antonio"
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="state">State</Label>
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
              <Label htmlFor="zip">Zip</Label>
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
            <Label htmlFor="timezone">Timezone</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? 'Saving...' : location ? 'Save Changes' : 'Add Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
