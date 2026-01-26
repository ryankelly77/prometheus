'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { TeamMemberCard } from './team-member-card'
import { InviteModal } from './invite-modal'
import { mockTeam } from '@/lib/mock-data/settings'
import type { TeamMember } from '@/types/settings'

const CURRENT_USER_ID = 'user-1' // Ryan Kelly

export function TeamTab() {
  const { toast } = useToast()
  const [team, setTeam] = useState<TeamMember[]>(mockTeam)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)

  const handleInvite = () => {
    setEditingMember(null)
    setIsModalOpen(true)
  }

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member)
    setIsModalOpen(true)
  }

  const handleSave = (data: {
    email: string
    role: TeamMember['role']
    locationAccess: 'all' | string[]
  }) => {
    if (editingMember) {
      // Update existing member
      setTeam(
        team.map((m) =>
          m.id === editingMember.id
            ? { ...m, role: data.role, locationAccess: data.locationAccess }
            : m
        )
      )
      toast({
        title: 'Team member updated',
        description: `${editingMember.name || editingMember.email}'s role has been updated.`,
      })
    } else {
      // Send new invite
      const newMember: TeamMember = {
        id: `user-${Date.now()}`,
        name: '',
        email: data.email,
        role: data.role,
        locationAccess: data.locationAccess,
        status: 'pending',
        invitedAt: new Date().toISOString(),
      }
      setTeam([...team, newMember])
      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${data.email}.`,
      })
    }
  }

  const handleResendInvite = (member: TeamMember) => {
    setTeam(
      team.map((m) =>
        m.id === member.id ? { ...m, invitedAt: new Date().toISOString() } : m
      )
    )
    toast({
      title: 'Invitation resent',
      description: `A new invitation has been sent to ${member.email}.`,
    })
  }

  const handleCancelInvite = (member: TeamMember) => {
    setTeam(team.filter((m) => m.id !== member.id))
    toast({
      title: 'Invitation cancelled',
      description: `The invitation to ${member.email} has been cancelled.`,
    })
  }

  const handleRemove = (member: TeamMember) => {
    setTeam(team.filter((m) => m.id !== member.id))
    toast({
      title: 'Team member removed',
      description: `${member.name || member.email} has been removed from the team.`,
    })
  }

  // Sort: owner first, then active members, then pending
  const sortedTeam = [...team].sort((a, b) => {
    if (a.role === 'owner') return -1
    if (b.role === 'owner') return 1
    if (a.status === 'pending' && b.status !== 'pending') return 1
    if (a.status !== 'pending' && b.status === 'pending') return -1
    return 0
  })

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
          {sortedTeam.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.id === CURRENT_USER_ID}
              onEdit={handleEdit}
              onResendInvite={handleResendInvite}
              onCancelInvite={handleCancelInvite}
              onRemove={handleRemove}
            />
          ))}
        </CardContent>
      </Card>

      <InviteModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        member={editingMember}
        onSave={handleSave}
      />
    </div>
  )
}
