'use client'
import { useState } from 'react'
import {
  PLANS,
  type BillingCycle,
  type SubscriptionSummary,
  type PlanId,
} from '@/lib/billing/plans'
import { PlanCards, money } from './plan-cards'
export function SubscriptionView({
  summary,
  onCheckout,
  onAction,
  onReconcile,
  busy,
}: {
  summary: SubscriptionSummary
  onCheckout: (plan: 'pro' | 'business', cycle: BillingCycle) => void
  onAction: (action: 'cancel' | 'resume' | 'downgrade', plan?: PlanId) => void
  onReconcile?: (invoiceId:string)=>void
  busy: boolean
}) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-500/30 p-5">
        <h2 className="text-xl font-bold">
          Votre plan : {PLANS[summary.plan].name}
        </h2>
        <p>
          État :{' '}
          {
            {
              free: 'Gratuit',
              active: 'Actif',
              grace: 'Délai de grâce',
              expired: 'Expiré',
            }[summary.status]
          }
        </p>
        {summary.periodEnd && (
          <p>
            Fin de période :{' '}
            {new Date(summary.periodEnd).toLocaleDateString('fr-FR')}
          </p>
        )}
        {summary.pendingPlan && (
          <p>Prochain plan : {PLANS[summary.pendingPlan].name}</p>
        )}
        {Object.entries(summary.usage).map(([key, value]) => (
          <p key={key}>
            {
              {
                orders: 'Commandes ce mois',
                drivers: 'Livreurs actifs',
                users: 'Utilisateurs',
              }[key]
            }{' '}
            : {value} /{' '}
            {summary.limits[key as keyof typeof summary.limits] ?? 'illimité'}
          </p>
        ))}
        {summary.canManageBilling && summary.plan !== 'discovery' && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={() =>
                onAction(summary.cancelAtPeriodEnd ? 'resume' : 'cancel')
              }
              className="underline"
            >
              {summary.cancelAtPeriodEnd
                ? 'Conserver le plan au renouvellement'
                : 'Arrêter au terme de la période'}
            </button>
            <button
              disabled={busy}
              onClick={() => onAction('downgrade', 'discovery')}
              className="underline"
            >
              Passer à Découverte à l’échéance
            </button>
            {summary.plan === 'business' && (
              <button
                disabled={busy}
                onClick={() => onAction('downgrade', 'pro')}
                className="underline"
              >
                Passer à Pro à l’échéance
              </button>
            )}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">Choisir votre plan</h2>
        <p className="mb-4 text-sm">
          Le renouvellement nécessite un paiement confirmé à chaque échéance. Un
          rappel vous sera envoyé avant la fin de période.
        </p>
        <div className="flex gap-2 mb-5">
          {(['monthly', 'yearly'] as const).map((value) => (
            <button
              key={value}
              aria-pressed={cycle === value}
              className={`rounded-lg px-4 py-2 ${cycle === value ? 'bg-indigo-600 text-white' : 'border border-gray-500/30'}`}
              onClick={() => setCycle(value)}
            >
              {value === 'monthly' ? 'Mensuel' : 'Annuel'}
            </button>
          ))}
        </div>
        <PlanCards
          cycle={cycle}
          current={summary.plan}
          onChoose={summary.canManageBilling ? onCheckout : undefined}
          busy={busy}
        />
        {!summary.canManageBilling && (
          <p className="mt-4">Seul le propriétaire peut gérer l’abonnement.</p>
        )}
        <p className="mt-4 text-sm">
          Paiement sécurisé sur la page de notre prestataire : Mobile Money en
          priorité, carte selon disponibilité. L’activation attend la
          confirmation du paiement.
        </p>
      </section>
      {summary.canManageBilling && (
        <section>
          <h2 className="text-xl font-bold">Historique des paiements</h2>
          {summary.payments.length === 0 ? (
            <p>Aucun paiement pour le moment.</p>
          ) : (
            <ul className="divide-y divide-gray-500/20">
              {summary.payments.map((payment) => (
                <li key={payment.id} className="py-3">
                  <p>
                    {new Date(payment.createdAt).toLocaleDateString('fr-FR')} ·{' '}
                    {PLANS[payment.plan].name} · {money(payment.amount)} FCFA ·{' '}
                    {({pending:'En attente',paid:'Payé',blocked:'Bloqué',expired:'Expiré',reversed:'Annulé / remboursé'} as Record<string,string>)[payment.state]??payment.state}
                  </p>
                  {payment.state==='pending' && onReconcile && <button disabled={busy} onClick={()=>onReconcile(payment.id)} className="underline mr-3">Vérifier ce paiement</button>}
                  {payment.state === 'paid' && (
                    <a className="underline" href={payment.receiptUrl}>
                      Télécharger le reçu PDF
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
