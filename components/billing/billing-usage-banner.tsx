'use client'
import Link from 'next/link'
import type { SubscriptionSummary } from '@/lib/billing/plans'
export function BillingUsageBanner({
  summary,
}: {
  summary: SubscriptionSummary | null
}) {
  if (
    !summary ||
    summary.limits.orders === null ||
    summary.usage.orders < summary.limits.orders - 5
  )
    return null
  const remaining = Math.max(0, summary.limits.orders - summary.usage.orders)
  return (
    <aside
      role="status"
      className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm"
    >
      {remaining > 0
        ? `Plus que ${remaining} commandes sur votre plan Découverte ce mois.`
        : 'Vous avez atteint 30 commandes ce mois. Vos commandes existantes restent accessibles et modifiables.'}{' '}
      {summary.canManageBilling ? (
        <Link href="/subscription" className="font-bold underline">
          Passer au plan Pro
        </Link>
      ) : (
        <span>Contactez le propriétaire pour changer de plan.</span>
      )}
    </aside>
  )
}
export function Paywall({
  message,
  canManageBilling = true,
}: {
  message: string
  canManageBilling?: boolean
}) {
  return (
    <div role="alert" className="rounded-xl border border-amber-400/40 p-4">
      <p>{message}</p>
      {canManageBilling ? (
        <Link href="/subscription" className="underline">
          Passer au plan Pro
        </Link>
      ) : (
        <p>Contactez le propriétaire de la boutique.</p>
      )}
    </div>
  )
}
