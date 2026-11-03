import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { DailyTrendChart } from '@/components/admin/daily-trend-chart'
import { EVENT_LABELS } from '@/lib/analytics-events'
import type { PlatformEventReport } from '@/services/platform-service'

export const REPORT_PERIODS = [7, 30, 90] as const
export type ReportPeriod = (typeof REPORT_PERIODS)[number]

type FunnelKey = keyof PlatformEventReport['funnel']
const STEPS: { key: FunnelKey; label: string; hint: string }[] = [
  { key: 'visitors', label: 'Visiteurs uniques', hint: 'Ont ouvert la page d’accueil' },
  { key: 'signupClicks', label: 'Clic « Commencer »', hint: 'Depuis la page d’accueil' },
  { key: 'signupViews', label: 'Page d’inscription vue', hint: 'Formulaire de création ouvert' },
  { key: 'signups', label: 'Boutiques créées', hint: 'Inscriptions terminées' },
  { key: 'firstOrder', label: 'Première commande', hint: 'Au moins une commande saisie' },
  { key: 'onboarded', label: 'Démarrage complet', hint: 'Produit, livreur et commande' },
  { key: 'paid', label: 'Abonnement payé', hint: 'Pro ou Business payé' },
]

export function EventReport({ report, period }: { report: PlatformEventReport; period: ReportPeriod }) {
  const max = Math.max(1, ...STEPS.map(s => report.funnel[s.key]))
  const topSource = Math.max(1, ...report.sources.map(s => s.visitors))
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analytique</h1>
          <p className="mt-1 text-sm text-gray-500">Du premier passage sur Warko jusqu’à l’abonnement payé.</p>
        </div>
        <nav aria-label="Période" className="flex gap-2">
          {REPORT_PERIODS.map(p => (
            <Link key={p} href={`/admin/analytics?period=${p}`} aria-current={p === period ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${p === period ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'}`}>
              {p} jours
            </Link>
          ))}
        </nav>
      </div>

      <Card className="p-4 sm:p-5">
        <section aria-labelledby="funnel-title">
          <h2 id="funnel-title" className="mb-4 text-lg font-semibold text-gray-900">Parcours des visiteurs</h2>
          <ol className="space-y-3">
            {STEPS.map((step, i) => {
              const value = report.funnel[step.key]
              const previous = i > 0 ? report.funnel[STEPS[i - 1].key] : 0
              const rate = i > 0 && previous > 0 && value <= previous ? Math.round((value / previous) * 100) : null
              return (
                <li key={step.key} role="group" aria-label={step.label} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-gray-700">{step.label}</p>
                    <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(value / max) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {step.hint}{rate !== null && <span className="font-medium text-gray-700"> · {rate} % de l’étape précédente</span>}
                  </p>
                </li>
              )
            })}
          </ol>
          {report.funnel.visitors === 0 && <p className="mt-3 text-sm text-gray-500">Pas encore de visite enregistrée sur cette période.</p>}
          <p className="mt-3 text-xs text-gray-500">Visites et clics comptés par navigateur depuis l’activation du suivi. Boutiques, commandes et paiements viennent des données réelles, boutiques internes exclues.</p>
        </section>
      </Card>

      {report.daily.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          <DailyTrendChart title="Visiteurs par jour" data={report.daily} dataKey="visitors" color="#4f46e5" unit="visiteurs" />
          <DailyTrendChart title="Boutiques créées par jour" data={report.daily} dataKey="signups" color="#059669" unit="boutiques" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <section aria-labelledby="sources-title">
            <h2 id="sources-title" className="mb-3 text-lg font-semibold text-gray-900">Provenance des visites</h2>
            {report.sources.length === 0 ? <p className="text-sm text-gray-500">Aucune visite sur cette période.</p> : (
              <ul className="space-y-2">
                {report.sources.map(s => (
                  <li key={s.source}>
                    <div className="flex justify-between gap-3 text-sm"><span className="truncate text-gray-700">{s.source === 'direct' ? 'Direct' : s.source}</span><span className="font-semibold tabular-nums text-gray-900">{s.visitors}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden="true"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${(s.visitors / topSource) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-gray-500">Ajoutez <code>?utm_source=facebook</code> (ou tiktok, whatsapp…) à vos liens pour suivre chaque canal.</p>
          </section>
        </Card>

        <Card className="p-4 sm:p-5">
          <section aria-labelledby="actions-title">
            <h2 id="actions-title" className="mb-3 text-lg font-semibold text-gray-900">Actions dans l’app</h2>
            {report.actions.length === 0 ? <p className="text-sm text-gray-500">Aucune action enregistrée sur cette période.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500"><th className="py-2 font-medium">Action</th><th className="py-2 text-right font-medium">Fois</th><th className="py-2 text-right font-medium">Boutiques</th></tr></thead>
                <tbody>
                  {report.actions.map(a => (
                    <tr key={a.name} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 pr-3 text-gray-700">{EVENT_LABELS[a.name as keyof typeof EVENT_LABELS] ?? a.name}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-gray-900">{a.events}</td>
                      <td className="py-2.5 text-right tabular-nums text-gray-600">{a.shops}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </Card>
      </div>
    </div>
  )
}
