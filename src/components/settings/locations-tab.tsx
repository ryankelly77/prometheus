'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { LocationCard } from './location-card'
import { LocationModal } from './location-modal'
import { mockLocations } from '@/lib/mock-data/settings'
import type { Location } from '@/types/settings'

export function LocationsTab() {
  const { toast } = useToast()
  const [locations, setLocations] = useState<Location[]>(mockLocations)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)

  const handleAddLocation = () => {
    setEditingLocation(null)
    setIsModalOpen(true)
  }

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location)
    setIsModalOpen(true)
  }

  const handleSaveLocation = (data: Partial<Location>) => {
    if (editingLocation) {
      // Edit existing
      setLocations(
        locations.map((loc) =>
          loc.id === editingLocation.id ? { ...loc, ...data } : loc
        )
      )
      toast({
        title: 'Location updated',
        description: `${data.name} has been updated.`,
      })
    } else {
      // Add new
      const newLocation: Location = {
        id: `loc-${Date.now()}`,
        name: data.name || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        timezone: data.timezone || 'America/Chicago',
        conceptType: data.conceptType || 'Full Service Restaurant',
        operatingHours: data.operatingHours,
        status: 'active',
        isDefault: false,
      }
      setLocations([...locations, newLocation])
      toast({
        title: 'Location added',
        description: `${newLocation.name} has been added.`,
      })
    }
  }

  const handleSetDefault = (location: Location) => {
    setLocations(
      locations.map((loc) => ({
        ...loc,
        isDefault: loc.id === location.id,
      }))
    )
    toast({
      title: 'Default location updated',
      description: `${location.name} is now your default location.`,
    })
  }

  const handleDuplicate = (location: Location) => {
    const newLocation: Location = {
      ...location,
      id: `loc-${Date.now()}`,
      name: `${location.name} (Copy)`,
      isDefault: false,
    }
    setLocations([...locations, newLocation])
    toast({
      title: 'Location duplicated',
      description: `${newLocation.name} has been created.`,
    })
  }

  const handleArchive = (location: Location) => {
    setLocations(
      locations.map((loc) =>
        loc.id === location.id
          ? { ...loc, status: loc.status === 'archived' ? 'active' : 'archived' }
          : loc
      )
    )
    toast({
      title: location.status === 'archived' ? 'Location restored' : 'Location archived',
      description: `${location.name} has been ${location.status === 'archived' ? 'restored' : 'archived'}.`,
    })
  }

  const handleDelete = (location: Location) => {
    setLocations(locations.filter((loc) => loc.id !== location.id))
    toast({
      title: 'Location deleted',
      description: `${location.name} has been deleted.`,
    })
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
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onEdit={handleEditLocation}
              onSetDefault={handleSetDefault}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </CardContent>
      </Card>

      <LocationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        location={editingLocation}
        onSave={handleSaveLocation}
      />
    </div>
  )
}
