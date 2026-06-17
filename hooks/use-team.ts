'use client'

import { useEffect, useState } from 'react'
import type { Profile } from '@/types/user'
import type { InviteEmployeeInput } from '@/lib/schemas/team.schema'

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
    if (!res.ok) throw new Error(await res.text())
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
    if (!res.ok) throw new Error(await res.text())
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  async function changeRole(id: string, role: 'admin' | 'employee') {
    const res = await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    if (!res.ok) throw new Error(await res.text())
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
  }

  return { members, isLoading, invite, remove, changeRole }
}
