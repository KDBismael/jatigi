'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  BillingCycle,
  PlanId,
  SubscriptionSummary,
} from '@/lib/billing/plans'
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await response.json()
  if (!response.ok)
    throw new Error(data.error || 'Une erreur est survenue. Réessayez.')
  return data
}
export function useSubscription() {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [isLoading, setLoading] = useState(true)
  const mutation = useRef(false)
  const refresh = useCallback(async () => {
    try {
      setSummary(await request<SubscriptionSummary>('/api/billing'))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])
  useEffect(() => {
    if (
      !summary?.payments.some((p) =>
        ['pending', 'processing'].includes(p.state),
      )
    )
      return
    const timer = setInterval(() => void refresh(), 10000)
    return () => clearInterval(timer)
  }, [summary, refresh])
  const run = async (task: () => Promise<void>) => {
    if (mutation.current) return
    mutation.current = true
    setBusy(true)
    setError(null)
    try {
      await task()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      mutation.current = false
      setBusy(false)
    }
  }
  const checkout = (plan: 'pro' | 'business', cycle: BillingCycle) =>
    run(async () => {
      const result = await request<{
        checkoutUrl: string | null
        state: string
      }>('/api/billing/checkout', { plan, cycle })
      if (result.checkoutUrl) {
        const url = new URL(result.checkoutUrl)
        if (url.protocol !== 'https:')
          throw new Error('Lien de paiement invalide.')
        window.location.assign(url.href)
      } else {
        await refresh()
        setError(
          'Paiement en attente de vérification. Ne payez pas une seconde fois.',
        )
      }
    })
  const action = (action: 'cancel' | 'resume' | 'downgrade', plan?: PlanId) =>
    run(async () => {
      await request('/api/billing/subscription', { action, plan })
      await refresh()
    })
  const reconcile = (invoiceId: string) =>
    run(async () => {
      await request('/api/billing/reconcile', { invoiceId })
      await refresh()
    })
  return {
    summary,
    error,
    busy,
    isLoading,
    refresh,
    checkout,
    action,
    reconcile,
  }
}
