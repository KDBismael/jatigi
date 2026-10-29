'use client'
import Link from 'next/link'
import { PLANS, type BillingCycle, type PlanId } from '@/lib/billing/plans'
export const money = (value: number) =>
  new Intl.NumberFormat('fr-FR').format(value).replace(/\u202f|\u00a0/g, ' ')
export function PlanCards({
  cycle = 'monthly',
  current,
  onChoose,
  busy = false,
  publicPage = false,
}: {
  cycle?: BillingCycle
  current?: PlanId
  onChoose?: (plan: 'pro' | 'business', cycle: BillingCycle) => void
  busy?: boolean
  publicPage?: boolean
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Object.values(PLANS).map((plan) => (
        <article
          key={plan.id}
          className={`rounded-2xl border p-6 ${plan.id === 'pro' ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-500/30'}`}
        >
          <p className="text-xs uppercase tracking-wider">
            {plan.id === 'pro' ? 'Pour développer votre boutique' : 'Warko'}
          </p>
          <h3 className="mt-2 text-xl font-bold">{plan.name}</h3>
          <p className="my-4">
            <strong className="text-3xl">{money(plan[cycle])}</strong> FCFA/
            {cycle === 'yearly' ? 'an' : 'mois'}
          </p>
          {cycle === 'yearly' && plan.monthly > 0 && (
            <p className="text-sm mb-4">
              <s>{money(plan.monthly * 12)} FCFA</s> · Économisez{' '}
              {money(plan.monthly * 12 - plan.yearly)} FCFA
            </p>
          )}
          <ul className="space-y-2 text-sm mb-5">
            <li>
              {plan.ordersPerMonth ?? 'Commandes illimitées'}
              {plan.ordersPerMonth ? ' commandes/mois' : ''}
            </li>
            <li>
              {plan.drivers ?? 'Nombre illimité de'} livreur
              {plan.drivers === 1 ? '' : 's'}
            </li>
            <li>
              {plan.users ?? 'Nombre illimité d’'} utilisateur
              {plan.users === 1 ? '' : 's'}
            </li>
            <li>
              {plan.dailyBalance
                ? 'Bilan détaillé par livreur + export'
                : 'Solde global des livreurs'}
            </li>
            <li>
              {plan.historyDays === null
                ? 'Historique complet'
                : plan.historyDays
                  ? 'Historique : 30 jours'
                  : 'Bilan basique'}
            </li>
            <li>
              {plan.liveSessions
                ? 'Sessions live incluses'
                : 'Catalogue, stock et dépenses inclus'}
            </li>
            <li>
              {plan.id === 'discovery'
                ? 'Support FAQ'
                : plan.id === 'pro'
                  ? 'Email + WhatsApp sous 48h'
                  : 'WhatsApp prioritaire sous 24h'}
            </li>
          </ul>
          {publicPage ? (
            <Link
              className="inline-block rounded-lg bg-indigo-600 px-4 py-3 text-white"
              href="/auth/signup"
            >
              Essayer gratuitement
            </Link>
          ) : plan.id !== 'discovery' && onChoose ? (
            <button
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-3 text-white disabled:opacity-50"
              onClick={() => onChoose(plan.id as 'pro' | 'business', cycle)}
            >
              {current === plan.id ? 'Renouveler' : 'Choisir'} {plan.name}
            </button>
          ) : current === plan.id ? (
            <p className="font-semibold">Plan actuel</p>
          ) : null}
        </article>
      ))}
    </div>
  )
}
