'use client'

import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Pencil, Mail, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/types/settings'
import { mockLocations } from '@/lib/mock-data/settings'

interface TeamMemberCardProps {
  member: TeamMember
  isCurrentUser: boolean
  onEdit: (member: TeamMember) => void
  onResendInvite: (member: TeamMember) => void
  onCancelInvite: (member: TeamMember) => void
  onRemove: (member: TeamMember) => void
}

const ROLE_LABELS: Record<TeamMember['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<TeamMember['role'], string> = {
  owner: 'bg-amber-100 text-amber-800',
  admin: 'bg-blue-100 text-blue-800',
  manager: 'bg-green-100 text-green-800',
  viewer: 'bg-slate-100 text-slate-800',
}

export function TeamMemberCard({
  member,
  isCurrentUser,
  onEdit,
  onResendInvite,
  onCancelInvite,
  onRemove,
}: TeamMemberCardProps) {
  const isPending = member.status === 'pending'

  const getLocationLabel = () => {
    if (member.locationAccess === 'all') return 'All Locations'
    if (Array.isArray(member.locationAccess)) {
      const locationNames = member.locationAccess
        .map((id) => mockLocations.find((l) => l.id === id)?.name)
        .filter(Boolean)
      return locationNames.join(', ') || 'No locations assigned'
    }
    return 'All Locations'
  }

  return (
    <Card className={cn(isPending && 'border-dashed')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full text-lg',
                isPending
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {isPending ? (
                <Mail className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  {isPending ? 'Pending Invite' : member.name}
                </h3>
                <Badge variant="secondary" className={cn('text-xs', ROLE_COLORS[member.role])}>
                  {ROLE_LABELS[member.role]}
                </Badge>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{member.email}</p>
              <p className="text-sm text-muted-foreground">{getLocationLabel()}</p>
              {isPending && member.invitedAt && (
                <p className="text-xs text-muted-foreground">
                  Invited {formatDistanceToNow(new Date(member.invitedAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPending ? (
              <>
                <Button variant="outline" size="sm" onClick={() => onResendInvite(member)}>
                  Resend
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancelInvite(member)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Cancel
                </Button>
              </>
            ) : !isCurrentUser && member.role !== 'owner' ? (
              <>
                <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
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
                    <DropdownMenuItem onClick={() => onEdit(member)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Role & Access
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onRemove(member)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove from Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
