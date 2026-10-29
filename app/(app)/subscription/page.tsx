'use client'
import { useEffect, useState } from 'react'
import { useSubscription } from '@/hooks/use-subscription'
import { SubscriptionView } from '@/components/billing/subscription-view'
export default function SubscriptionPage() {
  const billing = useSubscription()
  const [invoice, setInvoice] = useState<string | null>(null)
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('invoice')
    if (value && /^[0-9a-f-]{36}$/i.test(value)) {
      void Promise.resolve().then(() => setInvoice(value))
    }
  }, [])
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Abonnement et paiements</h1>
      {billing.error && (
        <div role="alert" className="rounded-xl border border-red-400/40 p-4">
          {billing.error}
          <button
            className="underline ml-3"
            onClick={() => void billing.refresh()}
          >
            Actualiser
          </button>
        </div>
      )}
      {billing.isLoading && <p>Chargement de votre abonnement…</p>}
      {invoice && billing.summary?.canManageBilling && (
        <div
          role="status"
          className="rounded-xl border border-indigo-400/40 p-4"
        >
          <p>
            Retour du paiement. Seule la confirmation du prestataire active
            votre plan. Retrouvez son état dans l’historique ci-dessous.
          </p>
          <button
            disabled={billing.busy}
            className="mt-2 underline"
            onClick={() => void billing.reconcile(invoice)}
          >
            Vérifier ce paiement
          </button>
        </div>
      )}
      {billing.summary && (
        <SubscriptionView
          summary={billing.summary}
          onCheckout={billing.checkout}
          onAction={billing.action}
          onReconcile={billing.reconcile}
          busy={billing.busy}
        />
      )}
    </main>
  )
}
