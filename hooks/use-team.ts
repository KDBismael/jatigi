'use client'

import { notifyBillingUsageChanged } from '@/lib/billing/usage-events'

import type { Role } from '@/lib/constants'

import { useEffect, useState } from 'react'
import type { Profile } from '@/types/user'
import type { InviteEmployeeInput } from '@/lib/schemas/team.schema'
import { responseError } from '@/lib/response-error'

export function useTeam() {
  const [members, setMembers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then(setMembers)
      .finally(() => setIsLoading(false))
  }, [])

  async function invite(input: InviteEmployeeInput) {
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw await responseError(res, 'Invitation impossible. Réessayez.')
    notifyBillingUsageChanged()
    const member = await res.json()
    setMembers((prev) => [member, ...prev])
    return member
  }

  async function remove(id: string) {
    const res = await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) throw await responseError(res, 'Suppression impossible. Réessayez.')
    notifyBillingUsageChanged()
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  async function changeRole(id: string, role: Role) {
    const res = await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    if (!res.ok) throw await responseError(res, 'Changement de rôle impossible. Réessayez.')
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
  }

  return { members, isLoading, invite, remove, changeRole }
}
