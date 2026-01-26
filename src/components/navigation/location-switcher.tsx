'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, MapPin, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useLocation } from '@/hooks/use-location'

interface LocationSwitcherProps {
  collapsed?: boolean
}

export function LocationSwitcher({ collapsed }: LocationSwitcherProps) {
  const [open, setOpen] = useState(false)
  const { locations, currentLocation, setCurrentLocation } = useLocation()

  const handleSelect = (locationId: string | null) => {
    if (locationId === null) {
      setCurrentLocation(null)
    } else {
      const location = locations.find((loc) => loc.id === locationId)
      setCurrentLocation(location || null)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a location"
          className={cn(
            'w-full justify-between bg-background',
            collapsed && 'w-10 justify-center px-0'
          )}
        >
          {collapsed ? (
            <MapPin className="h-4 w-4" />
          ) : (
            <>
              <div className="flex items-center gap-2 truncate">
                <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {currentLocation?.name || 'All Locations'}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Select Location
          </p>
        </div>
        <Separator />
        <ScrollArea className="max-h-[300px]">
          <div className="p-2">
            {/* All Locations Option */}
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                !currentLocation
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-accent'
              )}
            >
              <Building2 className="h-4 w-4" />
              <span className="flex-1 text-left">All Locations</span>
              {!currentLocation && <Check className="h-4 w-4" />}
            </button>

            <Separator className="my-2" />

            {/* Individual Locations */}
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Locations
            </p>
            {locations.map((location) => (
              <button
                key={location.id}
                onClick={() => handleSelect(location.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                  currentLocation?.id === location.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent'
                )}
              >
                <MapPin className="h-4 w-4" />
                <div className="flex-1 text-left">
                  <p className="truncate font-medium">{location.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {location.totalSeats} seats
                  </p>
                </div>
                {currentLocation?.id === location.id && (
                  <Check className="h-4 w-4 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
