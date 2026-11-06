'use client'
import { useEffect, useState } from 'react'
import { readBillingIntent, type BillingIntent } from '@/lib/billing/intent'
import { useSubscription } from '@/hooks/use-subscription'
import styles from '@/components/billing/subscription.module.css'
import { SubscriptionActionButton } from '@/components/billing/subscription-action-button'
import { SubscriptionView } from '@/components/billing/subscription-view'
import { TrackView } from '@/components/analytics/track-view'
export default function SubscriptionPage() {
  const billing = useSubscription()
  const [intent, setIntent] = useState<BillingIntent | null>(null)
  const [invoice, setInvoice] = useState<string | null>(null)
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('invoice')
    if (value && /^[0-9a-f-]{36}$/i.test(value)) {
      void Promise.resolve().then(() => setInvoice(value))
    }
  }, [])
  useEffect(() => {
    if (!billing.summary?.canManageBilling || billing.summary.plan !== 'discovery' || billing.summary.status !== 'free') return
    let active = true
    void fetch('/api/me').then(r => r.ok ? r.json() : null).then(me => {
      if (active && me?.profile?.id) setIntent(readBillingIntent(sessionStorage, me.profile.id))
    }).catch(() => {})
    return () => { active = false }
  }, [billing.summary?.canManageBilling, billing.summary?.plan, billing.summary?.status])
  const returnedPayment = billing.summary?.payments.find(payment => payment.id === invoice)
  const paymentConfirmed = returnedPayment?.state === 'paid'
  return (
    <main data-testid="subscription-page" className={styles.page}>
      <TrackView event="subscription_view" />
      <header className={styles.pageHeader}><h1>Abonnement et paiements</h1><p className={styles.muted}>Votre offre, votre consommation et vos paiements, au même endroit.</p></header>
      {billing.error && (
        <div role="alert" className={styles.pageError}>
          {billing.error}
          <SubscriptionActionButton
            className="ml-3"
            onClick={() => void billing.refresh()}
          >
            Actualiser
          </SubscriptionActionButton>
        </div>
      )}
      {billing.isLoading && <p>Chargement de votre abonnement…</p>}
      {invoice && billing.summary?.canManageBilling && (
        <div
          role="status"
          className={styles.pageReturn}
        >
          <p>
            {paymentConfirmed
              ? 'Paiement confirmé. Retrouvez votre reçu dans l’historique ci-dessous.'
              : 'Retour du paiement. Seule la confirmation du prestataire active votre plan. Retrouvez son état dans l’historique ci-dessous.'}
          </p>
          {!paymentConfirmed && <SubscriptionActionButton
            disabled={billing.busy}
            className="mt-2"
            onClick={() => void billing.reconcile(invoice)}
          >
            Vérifier ce paiement
          </SubscriptionActionButton>}
        </div>
      )}
      {billing.summary && (
        <SubscriptionView
          key={intent ? `${intent.userId}-${intent.plan}-${intent.cycle}` : 'current'}
          selectedIntent={intent}
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
