'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { mockLocations, TEAM_ROLES } from '@/lib/mock-data/settings'
import type { TeamMember } from '@/types/settings'

interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: TeamMember | null
  onSave: (data: {
    email: string
    role: TeamMember['role']
    locationAccess: 'all' | string[]
  }) => void
}

export function InviteModal({ open, onOpenChange, member, onSave }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamMember['role']>('manager')
  const [allLocations, setAllLocations] = useState(true)
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (member) {
      setEmail(member.email)
      setRole(member.role)
      if (member.locationAccess === 'all') {
        setAllLocations(true)
        setSelectedLocations([])
      } else {
        setAllLocations(false)
        setSelectedLocations(member.locationAccess)
      }
    } else {
      setEmail('')
      setRole('manager')
      setAllLocations(true)
      setSelectedLocations([])
    }
  }, [member, open])

  const handleLocationToggle = (locationId: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations([...selectedLocations, locationId])
    } else {
      setSelectedLocations(selectedLocations.filter((id) => id !== locationId))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    onSave({
      email,
      role,
      locationAccess: allLocations ? 'all' : selectedLocations,
    })
    setIsSaving(false)
    onOpenChange(false)
  }

  const isValid = email && role && (allLocations || selectedLocations.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit Team Member' : 'Invite Team Member'}</DialogTitle>
          <DialogDescription>
            {member
              ? 'Update role and location access for this team member.'
              : 'Send an invitation to join your team.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="team@example.com"
              disabled={!!member}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamMember['role'])}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <div className="font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Access */}
          <div className="space-y-3">
            <Label>Location Access</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-locations"
                  checked={allLocations}
                  onCheckedChange={(checked) => {
                    setAllLocations(!!checked)
                    if (checked) setSelectedLocations([])
                  }}
                />
                <label
                  htmlFor="all-locations"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  All Locations
                </label>
              </div>
              {!allLocations && (
                <div className="mt-2 space-y-2 border-t pt-2">
                  {mockLocations
                    .filter((l) => l.status !== 'archived')
                    .map((location) => (
                      <div key={location.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={location.id}
                          checked={selectedLocations.includes(location.id)}
                          onCheckedChange={(checked) =>
                            handleLocationToggle(location.id, !!checked)
                          }
                        />
                        <label
                          htmlFor={location.id}
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {location.name}
                        </label>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? 'Saving...' : member ? 'Save Changes' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
