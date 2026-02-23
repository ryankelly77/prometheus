'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { TeamMemberCard } from './team-member-card'
import { InviteModal } from './invite-modal'
import type { TeamMember } from '@/types/settings'

interface ApiInvitation {
  id: string
  email: string
  role: string
  restaurantGroupIds: string[]
  locationIds: string[]
  expiresAt: string
  acceptedAt: string | null
  invitedByEmail: string
  emailSentAt: string | null
  emailSentCount: number
  createdAt: string
  status: 'pending' | 'accepted' | 'expired'
}

interface ApiTeamMember {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  role: string
  isActive: boolean
  joinedAt: string
}

export function TeamTab() {
  const { toast } = useToast()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch team members and invitations
  const fetchTeam = useCallback(async () => {
    try {
      setIsLoading(true)

      // Fetch both team members and invitations in parallel
      const [membersRes, invitationsRes] = await Promise.all([
        fetch('/api/team'),
        fetch('/api/invitations'),
      ])

      const members: TeamMember[] = []

      // Process team members
      if (membersRes.ok) {
        const membersData = await membersRes.json()
        const apiMembers: ApiTeamMember[] = membersData.members || []

        for (const m of apiMembers) {
          members.push({
            id: m.id,
            name: m.fullName || '',
            email: m.email,
            avatarUrl: m.avatarUrl,
            role: mapApiRoleToDisplay(m.role),
            locationAccess: 'all', // TODO: Get actual access from API
            status: 'active',
            joinedAt: m.joinedAt,
          })
        }
      }

      // Process invitations
      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json()
        const apiInvitations: ApiInvitation[] = invitationsData.invitations || []

        for (const inv of apiInvitations) {
          if (inv.status !== 'accepted') {
            members.push({
              id: inv.id,
              name: '',
              email: inv.email,
              role: mapApiRoleToDisplay(inv.role),
              locationAccess: inv.locationIds.length > 0 ? inv.locationIds : 'all',
              status: inv.status === 'expired' ? 'expired' : 'pending',
              invitedAt: inv.createdAt,
            })
          }
        }
      }

      setTeam(members)
    } catch (error) {
      console.error('Error fetching team:', error)
      toast({
        title: 'Error',
        description: 'Failed to load team members.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  // Map API roles to display roles
  function mapApiRoleToDisplay(role: string): TeamMember['role'] {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'PARTNER_ADMIN':
        return 'owner'
      case 'GROUP_ADMIN':
        return 'admin'
      case 'LOCATION_MANAGER':
        return 'manager'
      case 'VIEWER':
      default:
        return 'viewer'
    }
  }

  // Map display roles to API roles
  function mapDisplayRoleToApi(role: TeamMember['role']): string {
    switch (role) {
      case 'owner':
        return 'PARTNER_ADMIN'
      case 'admin':
        return 'GROUP_ADMIN'
      case 'manager':
        return 'LOCATION_MANAGER'
      case 'viewer':
      default:
        return 'VIEWER'
    }
  }

  const handleInvite = () => {
    setEditingMember(null)
    setIsModalOpen(true)
  }

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member)
    setIsModalOpen(true)
  }

  const handleSave = async (data: {
    email: string
    role: TeamMember['role']
    locationAccess: 'all' | string[]
  }) => {
    setIsSaving(true)

    try {
      if (editingMember) {
        // Update existing member - TODO: Implement update API
        toast({
          title: 'Coming soon',
          description: 'Editing team members will be available soon.',
        })
      } else {
        // Send new invite via API
        const response = await fetch('/api/invitations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            role: mapDisplayRoleToApi(data.role),
            locationIds: data.locationAccess === 'all' ? [] : data.locationAccess,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to send invitation')
        }

        toast({
          title: 'Invitation sent',
          description: `An invitation has been sent to ${data.email}.`,
        })

        // Refresh the list
        await fetchTeam()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
      setIsModalOpen(false)
    }
  }

  const handleResendInvite = async (member: TeamMember) => {
    try {
      const response = await fetch(`/api/invitations/${member.id}/resend`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resend invitation')
      }

      toast({
        title: 'Invitation resent',
        description: `A new invitation has been sent to ${member.email}.`,
      })

      await fetchTeam()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend invitation.',
        variant: 'destructive',
      })
    }
  }

  const handleCancelInvite = async (member: TeamMember) => {
    try {
      const response = await fetch(`/api/invitations/${member.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel invitation')
      }

      toast({
        title: 'Invitation cancelled',
        description: `The invitation to ${member.email} has been cancelled.`,
      })

      await fetchTeam()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel invitation.',
        variant: 'destructive',
      })
    }
  }

  const handleRemove = async (member: TeamMember) => {
    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove team member')
      }

      toast({
        title: 'Team member removed',
        description: `${member.name || member.email} has been removed from the team.`,
      })

      await fetchTeam()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove team member.',
        variant: 'destructive',
      })
    }
  }

  // Sort: owner first, then active members, then pending
  const sortedTeam = [...team].sort((a, b) => {
    if (a.role === 'owner') return -1
    if (b.role === 'owner') return 1
    if (a.status === 'pending' && b.status !== 'pending') return 1
    if (a.status !== 'pending' && b.status === 'pending') return -1
    return 0
  })

  // Get current user ID from team (the one that's the owner or first active)
  const currentUserId = sortedTeam.find(m => m.role === 'owner')?.id || sortedTeam[0]?.id

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Team</CardTitle>
              <CardDescription>
                Manage who has access to your organization and what they can do.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Team</CardTitle>
            <CardDescription>
              Manage who has access to your organization and what they can do.
            </CardDescription>
          </div>
          <Button onClick={handleInvite} className="gap-2">
            <Plus className="h-4 w-4" />
            Invite
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedTeam.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No team members yet. Invite someone to get started.
            </p>
          ) : (
            sortedTeam.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                isCurrentUser={member.id === currentUserId}
                onEdit={handleEdit}
                onResendInvite={handleResendInvite}
                onCancelInvite={handleCancelInvite}
                onRemove={handleRemove}
              />
            ))
          )}
        </CardContent>
      </Card>

      <InviteModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        member={editingMember}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  )
}
