'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { LocationCard } from './location-card'
import { LocationModal } from './location-modal'

interface Location {
  id: string
  name: string
  neighborhood: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  timezone: string
  conceptType: string | null
  isActive: boolean
  isDefault: boolean
  restaurantGroup: {
    id: string
    name: string
  }
}

interface RestaurantGroup {
  id: string
  name: string
}

// Transform API location to UI format
function toUILocation(loc: Location) {
  return {
    id: loc.id,
    name: loc.name,
    neighborhood: loc.neighborhood || '',
    address: loc.address || '',
    city: loc.city || '',
    state: loc.state || '',
    zip: loc.zipCode || '',
    timezone: loc.timezone,
    conceptType: loc.conceptType || '',
    status: loc.isActive ? 'active' : 'archived',
    isDefault: loc.isDefault,
    restaurantGroupId: loc.restaurantGroup.id,
    restaurantGroupName: loc.restaurantGroup.name,
  }
}

type UILocation = ReturnType<typeof toUILocation>

export function LocationsTab() {
  const { toast } = useToast()
  const [locations, setLocations] = useState<UILocation[]>([])
  const [restaurantGroups, setRestaurantGroups] = useState<RestaurantGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<UILocation | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/locations')
      if (!response.ok) throw new Error('Failed to fetch locations')
      const data = await response.json()
      setLocations(data.locations.map(toUILocation))
    } catch (error) {
      console.error('Error fetching locations:', error)
      toast({
        title: 'Error',
        description: 'Failed to load locations',
        variant: 'destructive',
      })
    }
  }, [toast])

  const fetchRestaurantGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/restaurant-groups')
      if (!response.ok) throw new Error('Failed to fetch restaurant groups')
      const data = await response.json()
      setRestaurantGroups(data.groups)
    } catch (error) {
      console.error('Error fetching restaurant groups:', error)
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      await Promise.all([fetchLocations(), fetchRestaurantGroups()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchLocations, fetchRestaurantGroups])

  const handleAddLocation = () => {
    setEditingLocation(null)
    setIsModalOpen(true)
  }

  const handleEditLocation = (location: UILocation) => {
    setEditingLocation(location)
    setIsModalOpen(true)
  }

  const handleSaveLocation = async (data: Partial<UILocation>) => {
    setIsSaving(true)
    try {
      if (editingLocation) {
        // Update existing location
        const response = await fetch(`/api/locations/${editingLocation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            neighborhood: data.neighborhood || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            zipCode: data.zip || null,
            timezone: data.timezone,
            conceptType: data.conceptType || null,
            isDefault: data.isDefault,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update location')
        }

        toast({
          title: 'Location updated',
          description: `${data.name} has been updated.`,
        })
      } else {
        // Create new location
        const response = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            restaurantGroupId: data.restaurantGroupId || restaurantGroups[0]?.id,
            neighborhood: data.neighborhood || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            zipCode: data.zip || null,
            timezone: data.timezone || 'America/Chicago',
            conceptType: data.conceptType || null,
            isDefault: data.isDefault,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create location')
        }

        toast({
          title: 'Location added',
          description: `${data.name} has been added.`,
        })
      }

      // Refresh locations list
      await fetchLocations()
      setIsModalOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetDefault = async (location: UILocation) => {
    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })

      if (!response.ok) throw new Error('Failed to set default location')

      toast({
        title: 'Default location updated',
        description: `${location.name} is now your default location.`,
      })

      await fetchLocations()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set default location',
        variant: 'destructive',
      })
    }
  }

  const handleArchive = async (location: UILocation) => {
    const newStatus = location.status === 'archived' ? true : false
    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update location status')

      toast({
        title: location.status === 'archived' ? 'Location restored' : 'Location archived',
        description: `${location.name} has been ${location.status === 'archived' ? 'restored' : 'archived'}.`,
      })

      await fetchLocations()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update location status',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (location: UILocation) => {
    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete location')

      toast({
        title: 'Location deleted',
        description: `${location.name} has been deleted.`,
      })

      await fetchLocations()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete location',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              Manage your restaurant locations. Each location can have its own integrations and settings.
            </CardDescription>
          </div>
          <Button onClick={handleAddLocation} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {locations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No locations found. Add your first location to get started.
            </p>
          ) : (
            locations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onEdit={handleEditLocation}
                onSetDefault={handleSetDefault}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))
          )}
        </CardContent>
      </Card>

      <LocationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        location={editingLocation}
        onSave={handleSaveLocation}
        isSaving={isSaving}
        restaurantGroups={restaurantGroups}
      />
    </div>
  )
}
