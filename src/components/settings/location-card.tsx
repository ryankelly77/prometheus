'use client'

import { Building2, MoreHorizontal, Pencil, Star, Archive, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Location {
  id: string
  name: string
  neighborhood: string
  address: string
  city: string
  state: string
  zip: string
  timezone: string
  conceptType: string
  status: string
  isDefault: boolean
  restaurantGroupId: string
  restaurantGroupName: string
}

interface LocationCardProps {
  location: Location
  onEdit: (location: Location) => void
  onSetDefault: (location: Location) => void
  onArchive: (location: Location) => void
  onDelete: (location: Location) => void
}

export function LocationCard({
  location,
  onEdit,
  onSetDefault,
  onArchive,
  onDelete,
}: LocationCardProps) {
  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    active: { label: 'Active', color: 'text-green-600', dot: 'bg-green-600' },
    coming_soon: { label: 'Coming Soon', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
    archived: { label: 'Archived', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  }

  const status = statusConfig[location.status] || statusConfig.active

  // Format address display
  const addressParts = [location.address, location.city, location.state, location.zip]
    .filter(Boolean)
    .join(', ')
    .replace(/, ([A-Z]{2}), (\d{5})/, ', $1 $2') // Format "City, TX 78215"

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{location.name}</h3>
                {location.isDefault && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <Star className="h-3 w-3" />
                    Default
                  </span>
                )}
              </div>
              {location.neighborhood && (
                <p className="text-sm font-medium text-primary">{location.neighborhood}</p>
              )}
              {addressParts && (
                <p className="text-sm text-muted-foreground">{addressParts}</p>
              )}
              {location.restaurantGroupName && (
                <p className="text-xs text-muted-foreground">
                  Group: {location.restaurantGroupName}
                </p>
              )}
              <div className="flex items-center gap-4">
                <span className={cn('flex items-center gap-1.5 text-sm', status.color)}>
                  <span className={cn('h-2 w-2 rounded-full', status.dot)} />
                  {status.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {location.timezone}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(location)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!location.isDefault && (
                  <DropdownMenuItem onClick={() => onSetDefault(location)}>
                    <Star className="mr-2 h-4 w-4" />
                    Set as Default
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onArchive(location)}>
                  <Archive className="mr-2 h-4 w-4" />
                  {location.status === 'archived' ? 'Restore' : 'Archive'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(location)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
