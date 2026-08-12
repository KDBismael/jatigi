'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SalesPerson, SalesPersonEvaluation } from '@/types/sales-person'
import type { SalesPersonEvaluationInput, SalesPersonInput, SalesPersonUpdateInput } from '@/lib/schemas/sales-person.schema'

export function useSalesPeople() {
  const [people, setPeople] = useState<SalesPerson[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/sales-people')
      const data = await res.json()
      setPeople(Array.isArray(data) ? data : [])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function create(input: SalesPersonInput) {
    const res = await fetch('/api/sales-people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await res.text())
    const person = await res.json()
    setPeople((prev) => [person, ...prev].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.full_name.localeCompare(b.full_name)))
    return person as SalesPerson
  }

  async function update(input: SalesPersonUpdateInput) {
    const res = await fetch('/api/sales-people', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await res.text())
    const person = await res.json()
    setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, ...person } : p)))
    return person as SalesPerson
  }

  async function addEvaluation(id: string, input: SalesPersonEvaluationInput) {
    const res = await fetch(`/api/sales-people/${id}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await res.text())
    const evaluation = await res.json() as SalesPersonEvaluation
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, latest_evaluation: evaluation } : p)))
    return evaluation
  }

  async function remove(id: string) {
    const res = await fetch('/api/sales-people', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) throw new Error(await res.text())
    const result = await res.json() as { deleted: boolean; person?: SalesPerson; message: string }
    setPeople((prev) => result.deleted
      ? prev.filter((person) => person.id !== id)
      : prev.map((person) => (person.id === id && result.person ? { ...person, ...result.person } : person)))
    return result
  }

  return { people, isLoading, load, create, update, remove, addEvaluation }
}
