'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DeliveryDriverInput, DeliverySettlementInput } from '@/lib/schemas/delivery-driver.schema'
import type { DeliveryDriverSummary } from '@/types/delivery-driver'

export function useDeliveryDrivers() {
  const [drivers, setDrivers] = useState<DeliveryDriverSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/delivery-drivers')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Impossible de charger les livreurs')
      setDrivers(payload)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const task = Promise.resolve().then(refresh)
    return () => { void task }
  }, [refresh])

  async function create(input: DeliveryDriverInput) {
    const response = await fetch('/api/delivery-drivers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error((await response.json()).error ?? 'Création impossible')
    await refresh()
  }

  async function settle(driverId: string, input: DeliverySettlementInput) {
    const response = await fetch(`/api/delivery-drivers/${driverId}/settlements`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error((await response.json()).error ?? 'Reversement impossible')
    await refresh()
  }

  return { drivers, isLoading, error, create, settle, refresh }
}
