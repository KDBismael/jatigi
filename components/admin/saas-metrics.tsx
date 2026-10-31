import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { PlatformSaasMetrics } from '@/services/platform-service'

/** Rounded percentage, capped at 100; null when no cohort is eligible yet. */
export function ratio(part: number, total: number): number | null {
  if (!total) return null
  return Math.min(100, Math.round((part / total) * 100))
}

const BAR = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500' } as const
type Tone = keyof typeof BAR

export function SaasMetrics({ saas }: { saas: PlatformSaasMetrics }) {
  const arpu = saas.paidOrganizations ? saas.mrr / saas.paidOrganizations : null
  const ordersPerShop = saas.activeOrganizationsThisMonth
    ? Math.round(saas.ordersThisMonth / saas.activeOrganizationsThisMonth)
    : null

  return (
    <Card className="space-y-6 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Croissance SaaS</h2>
        {saas.mode === 'test' && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Paiements de test</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Headline label="Commandes sur 7 jours" value={String(saas.ordersLast7Days)} />
        <Headline label="Boutiques inscrites" value={String(saas.signups)} />
        <Headline label="MRR abonnements" value={formatCurrency(saas.mrr)} hint="Annuel ramené au mois" accent />
        <Headline label="Boutiques payantes" value={String(saas.paidOrganizations)} />
      </div>

      <Group id="saas-activation" title="Activation" columns="lg:grid-cols-4">
        <RateTile label="Onboarding réel terminé" part={saas.onboardingComplete} total={saas.signups} hint="Produit, livreur et commande créés" />
        <RateTile label="Activation J+1" part={saas.day1Activated} total={saas.day1Eligible} hint="Au moins 1 commande en 24 h" />
        <RateTile label="Activation J+7" part={saas.day7Activated} total={saas.day7Eligible} hint="Au moins 5 commandes en 7 jours" />
        <RateTile label="Conversion payante actuelle" part={saas.paidOrganizations} total={saas.signups} hint="Boutiques payantes sur inscrites" tone="emerald" />
      </Group>

      <Group id="saas-retention" title="Rétention" columns="lg:grid-cols-3">
        <RateTile label="Rétention au mois 2" part={saas.retentionM1Active} total={saas.retentionM1Eligible} hint="Actives le mois civil suivant l’inscription" tone="emerald" />
        <RateTile label="Rétention au mois 4" part={saas.retentionM3Active} total={saas.retentionM3Eligible} hint="Actives 3 mois civils après l’inscription" tone="emerald" />
        <RateTile label="Churn payé du mois en cours" part={saas.paidLostThisMonth} total={saas.paidAtMonthStart} unit="boutiques payantes" hint="Plus bas, c’est mieux" tone="amber" />
      </Group>

      <Group id="saas-usage" title="Revenus et usage" columns="">
        <ValueTile
          label="ARPU mensuel payant"
          value={arpu === null ? null : formatCurrency(arpu)}
          empty="Aucune boutique payante"
          detail={`${formatCurrency(saas.mrr)} de MRR, ${saas.paidOrganizations} payante(s)`}
        />
        <ValueTile
          label="Commandes par boutique active ce mois"
          value={ordersPerShop === null ? null : String(ordersPerShop)}
          empty="Aucune boutique active ce mois"
          detail={`${saas.ordersThisMonth} commandes, ${saas.activeOrganizationsThisMonth} boutique(s) active(s)`}
        />
      </Group>

      <ul className="space-y-1 border-t border-gray-100 pt-4 text-xs text-gray-500">
        <li>Activation calculée sur les cohortes arrivées à échéance.</li>
        <li>Rétention par mois civil suivant l’inscription.</li>
        <li>Visiteurs et coût publicitaire nécessitent une source analytics et un budget renseignés.</li>
      </ul>
    </Card>
  )
}

function Headline({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 sm:p-4 ${accent ? 'bg-indigo-50' : 'bg-gray-50'}`}>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${accent ? 'text-indigo-700' : 'text-gray-900'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function Group({ id, title, columns, children }: { id: string; title: string; columns: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${columns}`}>{children}</div>
    </section>
  )
}

/** Label and value share a row on phones and stack from 640px. */
function Tile({ label, value, children }: { label: string; value: string | null; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3 sm:block">
        <p className="text-sm font-medium leading-snug text-gray-700">{label}</p>
        {value !== null && (
          <p className="shrink-0 whitespace-nowrap text-2xl font-bold tabular-nums text-gray-900 sm:mt-2 sm:text-3xl">{value}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="mt-2 text-sm font-medium text-gray-400">{text}</p>
}

function RateTile({ label, part, total, hint, unit = 'boutiques', tone = 'indigo' }: {
  label: string; part: number; total: number; hint: string; unit?: string; tone?: Tone
}) {
  const pct = ratio(part, total)
  return (
    <Tile label={label} value={pct === null ? null : `${pct} %`}>
      {pct === null ? <Empty text="Aucune cohorte éligible pour l’instant" /> : <>
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"
        >
          <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs font-medium tabular-nums text-gray-600">{part} sur {total} {unit}</p>
      </>}
      <p className="mt-auto pt-2 text-xs text-gray-500">{hint}</p>
    </Tile>
  )
}

function ValueTile({ label, value, empty, detail }: { label: string; value: string | null; empty: string; detail: string }) {
  return (
    <Tile label={label} value={value}>
      {value === null && <Empty text={empty} />}
      <p className="mt-auto pt-2 text-xs text-gray-500">{detail}</p>
    </Tile>
  )
}
